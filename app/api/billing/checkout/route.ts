// POST /api/billing/checkout
// Erstellt eine Stripe Checkout Session fuer Plus oder Pro Plan
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import type { PaidPlan, BillingCycle } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Zahlungen sind derzeit nicht verfuegbar.' },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const body = await request.json();
  const plan = body.plan as PaidPlan;
  const cycle = (body.billing_cycle || 'monthly') as BillingCycle;

  if (!['plus', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Ungueltiger Plan' }, { status: 400 });
  }

  const priceKey = `${plan}_${cycle}` as keyof typeof STRIPE_PRICES;
  const priceId = STRIPE_PRICES[priceKey];

  if (!priceId) {
    return NextResponse.json(
      { error: 'Preis-Konfiguration fehlt. Bitte kontaktieren Sie den Support.' },
      { status: 500 }
    );
  }

  try {
    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/care/subscription?checkout=success`,
      cancel_url: `${origin}/care/subscription?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
        billing_cycle: cycle,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Fehler:', err);
    return NextResponse.json(
      { error: 'Checkout konnte nicht erstellt werden.' },
      { status: 500 }
    );
  }
}
