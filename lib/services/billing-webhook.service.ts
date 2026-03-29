// Nachbar.io — Billing Webhook Service
// Verarbeitet Stripe Webhook-Events nach Signatur-Verifizierung.
// Behandelt: checkout.session.completed, invoice.paid, customer.subscription.deleted

import { getAdminSupabase } from "@/lib/supabase/admin";
import type { PaidPlan } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Verarbeitet ein verifiziertes Stripe-Event.
 * Signatur-Pruefung erfolgt in der Route — hier kommt nur das bereits verifizierte Event an.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const adminDb = getAdminSupabase();

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        adminDb,
        event.data.object as Stripe.Checkout.Session,
      );
      break;

    case "invoice.paid":
      await handleInvoicePaid(adminDb, event.data.object as Stripe.Invoice);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        adminDb,
        event.data.object as Stripe.Subscription,
      );
      break;

    default:
      // Unbekannte Events ignorieren
      break;
  }
}

// --- Checkout Session abgeschlossen ---
async function handleCheckoutCompleted(
  adminDb: ReturnType<typeof getAdminSupabase>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as PaidPlan | undefined;
  const quarterId = session.metadata?.quarter_id;
  const role = session.metadata?.role;

  if (!userId || !plan) return;

  // Subscription in DB aktualisieren oder erstellen
  const { error } = await adminDb.from("care_subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status: "active",
      payment_provider: "stripe",
      external_subscription_id: session.subscription as string,
      current_period_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Subscription-Update Fehler:", error);
    return;
  }

  // Rolle in users-Tabelle setzen basierend auf Plan
  const roleMap: Record<string, string> = {
    plus: "caregiver",
    pro_community: "org_admin",
    pro_medical: "doctor",
  };

  const newRole = roleMap[plan];
  if (newRole) {
    const { error: roleError } = await adminDb
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (roleError) console.error("Rollen-Update Fehler:", roleError);
  }

  // Pro Community: org_member erstellen mit Quartier-Zuweisung
  if (plan === "pro_community" && quarterId) {
    const { data: existingMember } = await adminDb
      .from("org_members")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      const { error: orgError } = await adminDb.from("org_members").insert({
        user_id: userId,
        role: "admin",
        assigned_quarters: [quarterId],
      });

      if (orgError) console.error("org_member Erstellung Fehler:", orgError);
    }
  }

  // Pro Medical: doctor_profile erstellen
  if (plan === "pro_medical" || role === "doctor") {
    const { data: existingProfile } = await adminDb
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: docError } = await adminDb.from("doctor_profiles").insert({
        user_id: userId,
        status: "pending_verification",
      });

      if (docError)
        console.error("doctor_profile Erstellung Fehler:", docError);
    }
  }
}

// --- Rechnung bezahlt (Abo-Verlaengerung) ---
async function handleInvoicePaid(
  adminDb: ReturnType<typeof getAdminSupabase>,
  invoice: Stripe.Invoice,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe v20 hat subscription als string|Subscription
  const sub = (invoice as any).subscription;
  const subscriptionId = (typeof sub === "string" ? sub : sub?.id) as string;
  if (!subscriptionId) return;

  // Abrechnungszeitraum aktualisieren, Status auf active setzen (Verlaengerung)
  const { error } = await adminDb
    .from("care_subscriptions")
    .update({
      status: "active",
      current_period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : undefined,
      current_period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("external_subscription_id", subscriptionId);

  if (error) console.error("Invoice-Update Fehler:", error);
}

// --- Abo gekuendigt ---
async function handleSubscriptionDeleted(
  adminDb: ReturnType<typeof getAdminSupabase>,
  subscription: Stripe.Subscription,
): Promise<void> {
  // Downgrade auf Free: Rolle zuruecksetzen, aber Daten behalten
  const { data: subData } = await adminDb
    .from("care_subscriptions")
    .select("user_id")
    .eq("external_subscription_id", subscription.id)
    .maybeSingle();

  const { error } = await adminDb
    .from("care_subscriptions")
    .update({
      status: "cancelled",
      plan: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("external_subscription_id", subscription.id);

  if (error) console.error("Subscription-Kündigung Fehler:", error);

  // Rolle auf 'user' zuruecksetzen (Daten bleiben erhalten, nur Zugriff entfernt)
  if (subData?.user_id) {
    const { error: roleError } = await adminDb
      .from("users")
      .update({ role: "user", updated_at: new Date().toISOString() })
      .eq("id", subData.user_id);

    if (roleError) console.error("Rollen-Downgrade Fehler:", roleError);
  }
}
