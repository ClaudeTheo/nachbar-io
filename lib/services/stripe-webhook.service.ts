// Nachbar.io — Service fuer Stripe Webhook-Verarbeitung (Hilfe-Subscriptions)
// Signaturpruefung bleibt in der Route (benoetigt Raw-Body).
// Dieser Service verarbeitet das verifizierte Event-Objekt.

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/**
 * Verarbeitet ein verifiziertes Stripe-Webhook-Event.
 * Behandelt Subscription-Lifecycle: created, updated, deleted, paused, resumed.
 */
export async function handleStripeWebhook(
  adminSupabase: SupabaseClient,
  event: Stripe.Event,
): Promise<void> {
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

      await adminSupabase
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

      await adminSupabase
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

      await adminSupabase
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

      await adminSupabase
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
}
