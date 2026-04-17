// Nachbar.io — Billing Checkout Service
// Erstellt Stripe Checkout Sessions oder aktiviert Early-Adopter-Abos kostenlos.
// Unterstuetzt alle Plan-Typen: plus, pro_community, pro_medical

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { stripe, getStripePriceId } from "@/lib/stripe";
import type { PaidPlan, BillingInterval } from "@/lib/stripe";
import { writeAuditLog } from "@/lib/care/audit";
import { ServiceError } from "@/lib/services/service-error";

// Gueltige bezahlte Plan-Typen
// Phase 1 (Bad Saeckingen Pilot): Nur Plus. Pro Community = B2B-Direktvertrag (HR/VR-Pruefung),
// Pro Medical ist geparkt bis MRR > 500 EUR. Bei Re-Aktivierung auch DB-Constraint (Mig. 060)
// erweitern und UI (SubscriptionPlans) entsprechend anpassen.
const VALID_PAID_PLANS: PaidPlan[] = ["plus"];

// Erste 200 Nutzer bekommen alle Plaene kostenlos
const EARLY_ADOPTER_LIMIT = 200;

// Eingabe-Typ fuer den Checkout-Service
export interface CheckoutInput {
  planType?: string;
  plan?: string;
  interval?: string;
  billing_cycle?: string;
  quarterId?: string;
}

// Ergebnis-Typ: entweder Early-Adopter oder Stripe-URL
export type CheckoutResult =
  | { earlyAdopter: true; subscription: Record<string, unknown> }
  | { url: string | null };

/**
 * Erstellt eine Billing-Checkout-Session.
 * Fuer Early Adopter wird das Abo direkt kostenlos aktiviert.
 * Ab 200 Nutzern wird eine Stripe Checkout Session erstellt.
 */
export async function createBillingCheckout(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
  body: CheckoutInput,
  origin: string,
): Promise<CheckoutResult> {
  // Abwaertskompatibilitaet: planType oder plan akzeptieren, interval oder billing_cycle
  const plan = (body.planType || body.plan) as PaidPlan;
  const interval = (body.interval ||
    body.billing_cycle ||
    "monthly") as BillingInterval;
  const quarterId = body.quarterId as string | undefined;

  // Validierung: Nur gueltige bezahlte Plaene erlaubt
  if (!VALID_PAID_PLANS.includes(plan)) {
    throw new ServiceError("Ungültiger Plan", 400);
  }

  // pro_community erfordert eine quarterId
  if (plan === "pro_community" && !quarterId) {
    throw new ServiceError(
      "Pro Community erfordert eine Quartier-ID (quarterId)",
      400,
    );
  }

  // Early-Adopter-Pruefung: Anzahl bezahlter Abos zaehlen
  const adminDb = getAdminSupabase();
  const { count } = await adminDb
    .from("care_subscriptions")
    .select("id", { count: "exact", head: true })
    .in("plan", ["plus", "pro_community", "pro_medical"])
    .in("status", ["active", "trial"]);

  const totalPaidSubs = count ?? 0;

  // Pruefe ob dieser User bereits ein Early-Adopter-Abo hat
  const { data: existingSub } = await adminDb
    .from("care_subscriptions")
    .select("id, plan, payment_provider")
    .eq("user_id", userId)
    .maybeSingle();

  const isAlreadyEarlyAdopter =
    existingSub?.payment_provider === "early_adopter";

  if (totalPaidSubs < EARLY_ADOPTER_LIMIT || isAlreadyEarlyAdopter) {
    // Early Adopter: Plan direkt kostenlos aktivieren
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 Jahr gueltig

    if (existingSub) {
      const { data, error } = await adminDb
        .from("care_subscriptions")
        .update({
          plan,
          status: "active",
          payment_provider: "early_adopter",
          current_period_start: now.toISOString().split("T")[0],
          current_period_end: periodEnd.toISOString().split("T")[0],
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id)
        .select()
        .single();

      if (error) {
        throw new ServiceError("Vorgang fehlgeschlagen", 500);
      }

      // Plan-spezifische Provisioning (auch fuer Early Adopter)
      await provisionPlanResources(adminDb, userId, plan, quarterId);

      writeAuditLog(supabase, {
        seniorId: userId,
        actorId: userId,
        eventType: "subscription_changed",
        referenceType: "care_subscriptions",
        referenceId: data.id,
        metadata: {
          old_plan: existingSub.plan,
          new_plan: plan,
          early_adopter: true,
          adopter_number: totalPaidSubs + 1,
          quarterId,
        },
      });

      return { earlyAdopter: true, subscription: data };
    } else {
      const { data, error } = await adminDb
        .from("care_subscriptions")
        .insert({
          user_id: userId,
          plan,
          status: "active",
          payment_provider: "early_adopter",
          current_period_start: now.toISOString().split("T")[0],
          current_period_end: periodEnd.toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) {
        throw new ServiceError("Vorgang fehlgeschlagen", 500);
      }

      // Plan-spezifische Provisioning (auch fuer Early Adopter)
      await provisionPlanResources(adminDb, userId, plan, quarterId);

      writeAuditLog(supabase, {
        seniorId: userId,
        actorId: userId,
        eventType: "subscription_changed",
        referenceType: "care_subscriptions",
        referenceId: data.id,
        metadata: {
          old_plan: "free",
          new_plan: plan,
          early_adopter: true,
          adopter_number: totalPaidSubs + 1,
          quarterId,
        },
      });

      return { earlyAdopter: true, subscription: data };
    }
  }

  // Ab 200 Nutzer: Stripe Checkout
  if (!stripe) {
    throw new ServiceError("Zahlungen sind derzeit nicht verfügbar.", 503);
  }

  const priceId = getStripePriceId(plan, interval);

  if (!priceId) {
    throw new ServiceError(
      "Preis-Konfiguration fehlt. Bitte kontaktieren Sie den Support.",
      500,
    );
  }

  // Plan-spezifische Metadata fuer Webhook-Verarbeitung
  const metadata: Record<string, string> = {
    user_id: userId,
    plan,
    billing_cycle: interval,
  };

  // Pro Community: Quartier-ID mitgeben fuer org_member Erstellung
  if (plan === "pro_community" && quarterId) {
    metadata.quarter_id = quarterId;
  }

  // Pro Medical: Arzt-Rolle markieren fuer doctor_profile Erstellung
  if (plan === "pro_medical") {
    metadata.role = "doctor";
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/care/subscription?checkout=success`,
      cancel_url: `${origin}/care/subscription?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata,
    });

    return { url: session.url };
  } catch (err) {
    console.error("Stripe Checkout Fehler:", err);
    throw new ServiceError("Checkout konnte nicht erstellt werden.", 500);
  }
}

// Plan-spezifische Ressourcen erstellen (org_member, doctor_profile etc.)
// Wird von Checkout (Early Adopter) und Webhook (Stripe) aufgerufen
export async function provisionPlanResources(
  adminDb: ReturnType<typeof getAdminSupabase>,
  userId: string,
  plan: PaidPlan,
  quarterId?: string,
): Promise<void> {
  // Rolle in users-Tabelle aktualisieren
  const roleMap: Record<PaidPlan, string> = {
    plus: "caregiver",
    pro_community: "org_admin",
    pro_medical: "doctor",
  };

  const newRole = roleMap[plan];
  if (newRole) {
    await adminDb
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  // Pro Community: org_member Eintrag erstellen
  if (plan === "pro_community" && quarterId) {
    const { data: existingMember } = await adminDb
      .from("org_members")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      await adminDb.from("org_members").insert({
        user_id: userId,
        role: "admin",
        assigned_quarters: [quarterId],
      });
    }
  }

  // Pro Medical: doctor_profile erstellen (falls noch nicht vorhanden)
  if (plan === "pro_medical") {
    const { data: existingProfile } = await adminDb
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await adminDb.from("doctor_profiles").insert({
        user_id: userId,
        status: "pending_verification",
      });
    }
  }
}
