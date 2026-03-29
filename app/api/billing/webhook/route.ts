// POST /api/billing/webhook
// Stripe Webhook Handler — Signatur-Verifizierung in der Route,
// Event-Verarbeitung in billing-webhook.service.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/services/billing-webhook.service";

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe nicht konfiguriert" },
      { status: 503 },
    );
  }

  // Signatur-Verifizierung MUSS in der Route bleiben (braucht Raw Body)
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook nicht konfiguriert" },
      { status: 400 },
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook Signatur ungültig:", err);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  // Verifiziertes Event an den Service delegieren
  await handleStripeEvent(event);

  return NextResponse.json({ received: true });
}
