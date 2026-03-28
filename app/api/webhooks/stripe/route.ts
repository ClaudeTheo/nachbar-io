// POST /api/webhooks/stripe — Stripe Webhook für Hilfe-Subscriptions
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getStripe } from "@/modules/hilfe/services/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("[hilfe-webhook] Stripe nicht konfiguriert");
    return NextResponse.json(
      { error: "Webhook nicht konfiguriert" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Fehlende Stripe-Signatur" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[hilfe-webhook] Signaturprüfung fehlgeschlagen:", message);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const helperId = subscription.metadata?.helper_id;
      if (!helperId) break;

      const status = subscription.status;
      let subscriptionStatus: string;

      if (status === "active" || status === "trialing") {
        subscriptionStatus = "active";
      } else if (status === "past_due" || status === "unpaid") {
        subscriptionStatus = "active"; // Kulanz: noch aktiv bei Zahlungsproblemen
      } else if (status === "paused") {
        subscriptionStatus = "paused";
      } else {
        subscriptionStatus = "cancelled";
      }

      await supabase
        .from("neighborhood_helpers")
        .update({
          subscription_status: subscriptionStatus,
          stripe_subscription_id: subscription.id,
          subscription_paused_at:
            subscriptionStatus === "paused" ? new Date().toISOString() : null,
        })
        .eq("id", helperId);

      console.log(
        `[hilfe-webhook] Subscription ${subscription.id} → ${subscriptionStatus} für Helfer ${helperId}`,
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const helperId = subscription.metadata?.helper_id;
      if (!helperId) break;

      await supabase
        .from("neighborhood_helpers")
        .update({
          subscription_status: "cancelled",
          subscription_cancelled_at: new Date().toISOString(),
        })
        .eq("id", helperId);

      console.log(
        `[hilfe-webhook] Subscription ${subscription.id} gekündigt für Helfer ${helperId}`,
      );
      break;
    }

    case "customer.subscription.paused": {
      const subscription = event.data.object as Stripe.Subscription;
      const helperId = subscription.metadata?.helper_id;
      if (!helperId) break;

      await supabase
        .from("neighborhood_helpers")
        .update({
          subscription_status: "paused",
          subscription_paused_at: new Date().toISOString(),
        })
        .eq("id", helperId);

      console.log(
        `[hilfe-webhook] Subscription ${subscription.id} pausiert für Helfer ${helperId}`,
      );
      break;
    }

    case "customer.subscription.resumed": {
      const subscription = event.data.object as Stripe.Subscription;
      const helperId = subscription.metadata?.helper_id;
      if (!helperId) break;

      await supabase
        .from("neighborhood_helpers")
        .update({
          subscription_status: "active",
          subscription_paused_at: null,
        })
        .eq("id", helperId);

      console.log(
        `[hilfe-webhook] Subscription ${subscription.id} wieder aktiviert für Helfer ${helperId}`,
      );
      break;
    }

    default:
      // Andere Events akzeptieren, aber nicht verarbeiten
      break;
  }

  return NextResponse.json({ received: true });
}
