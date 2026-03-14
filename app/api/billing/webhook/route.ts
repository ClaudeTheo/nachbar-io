// POST /api/billing/webhook
// Stripe Webhook Handler — verarbeitet Abo-Events
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';

// Service-Client fuer DB-Updates (umgeht RLS)
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe nicht konfiguriert' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook nicht konfiguriert' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Signatur ungueltig:', err);
    return NextResponse.json({ error: 'Ungueltige Signatur' }, { status: 400 });
  }

  const adminDb = getAdminSupabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;

      if (!userId || !plan) break;

      // Subscription in DB aktualisieren oder erstellen
      const { error } = await adminDb
        .from('care_subscriptions')
        .upsert({
          user_id: userId,
          plan,
          status: 'active',
          payment_provider: 'stripe',
          external_subscription_id: session.subscription as string,
          current_period_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) console.error('Subscription-Update Fehler:', error);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe v20 hat subscription als string|Subscription
      const sub = (invoice as any).subscription;
      const subscriptionId = (typeof sub === 'string' ? sub : sub?.id) as string;
      if (!subscriptionId) break;

      // Abrechnungszeitraum aktualisieren
      const { error } = await adminDb
        .from('care_subscriptions')
        .update({
          status: 'active',
          current_period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : undefined,
          current_period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('external_subscription_id', subscriptionId);

      if (error) console.error('Invoice-Update Fehler:', error);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      const { error } = await adminDb
        .from('care_subscriptions')
        .update({
          status: 'cancelled',
          plan: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('external_subscription_id', subscription.id);

      if (error) console.error('Subscription-Kuendigung Fehler:', error);
      break;
    }

    default:
      // Unbekannte Events ignorieren
      break;
  }

  return NextResponse.json({ received: true });
}
