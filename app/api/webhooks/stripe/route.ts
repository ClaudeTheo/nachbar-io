// POST /api/webhooks/stripe — Stripe Webhook fuer Hilfe-Subscriptions
// Signaturpruefung bleibt in der Route (benoetigt Raw-Body).
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getStripe } from "@/modules/hilfe/services/stripe";
import { handleStripeWebhook } from "@/lib/services/stripe-webhook.service";
import { handleServiceError } from "@/lib/services/service-error";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  const billingEnabled = await isFeatureEnabledServer(
    supabase,
    "BILLING_ENABLED",
  );
  if (!billingEnabled) {
    console.info("billing_disabled_webhook_received");
    return new NextResponse(null, { status: 200 });
  }

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

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[hilfe-webhook] Signaturprüfung fehlgeschlagen:", message);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  try {
    await handleStripeWebhook(supabase, event);
    return NextResponse.json({ received: true });
  } catch (error) {
    return handleServiceError(error);
  }
}
