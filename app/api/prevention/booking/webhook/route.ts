// POST /api/prevention/booking/webhook
// Stripe Webhook fuer Praevention-Zahlungen
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { handlePreventionPaymentSuccess } from "@/modules/praevention/services/payment.service";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe nicht konfiguriert" },
      { status: 503 },
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_PREVENTION_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook-Signatur oder Secret fehlt" },
      { status: 400 },
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook-Signatur ungültig:", err);
    return NextResponse.json(
      { error: "Ungültige Signatur" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status === "paid") {
          await handlePreventionPaymentSuccess(
            {
              id: session.payment_intent as string,
              metadata: session.metadata,
              amount: session.amount_total || undefined,
            },
            "checkout",
          );
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        await handlePreventionPaymentSuccess(
          {
            id: invoice.id,
            metadata: invoice.metadata,
            amount_paid: invoice.amount_paid,
          },
          "invoice",
        );
        break;
      }

      default:
        // Unbekanntes Event — ignorieren
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook-Verarbeitung fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Webhook-Verarbeitung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
