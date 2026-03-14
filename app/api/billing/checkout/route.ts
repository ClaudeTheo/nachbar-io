// POST /api/billing/checkout
// Erstellt eine Stripe Checkout Session — oder aktiviert kostenlos fuer Early Adopter
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import type { PaidPlan, BillingCycle } from '@/lib/stripe';
import { writeAuditLog } from '@/lib/care/audit';

// Service-Client fuer DB-Updates (umgeht RLS)
function getAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Erste 200 Nutzer bekommen alle Plaene kostenlos
const EARLY_ADOPTER_LIMIT = 200;

export async function POST(request: NextRequest) {
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

  // Early-Adopter-Pruefung: Anzahl bezahlter Abos zaehlen
  const adminDb = getAdminSupabase();
  const { count } = await adminDb
    .from('care_subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('plan', ['plus', 'pro'])
    .in('status', ['active', 'trial']);

  const totalPaidSubs = count ?? 0;

  // Pruefe ob dieser User bereits ein Early-Adopter-Abo hat
  const { data: existingSub } = await adminDb
    .from('care_subscriptions')
    .select('id, plan, payment_provider')
    .eq('user_id', user.id)
    .maybeSingle();

  const isAlreadyEarlyAdopter = existingSub?.payment_provider === 'early_adopter';

  if (totalPaidSubs < EARLY_ADOPTER_LIMIT || isAlreadyEarlyAdopter) {
    // Early Adopter: Plan direkt kostenlos aktivieren
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 Jahr gueltig

    if (existingSub) {
      const { data, error } = await adminDb
        .from('care_subscriptions')
        .update({
          plan,
          status: 'active',
          payment_provider: 'early_adopter',
          current_period_start: now.toISOString().split('T')[0],
          current_period_end: periodEnd.toISOString().split('T')[0],
          updated_at: now.toISOString(),
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      writeAuditLog(supabase, {
        seniorId: user.id,
        actorId: user.id,
        eventType: 'subscription_changed',
        referenceType: 'care_subscriptions',
        referenceId: data.id,
        metadata: { old_plan: existingSub.plan, new_plan: plan, early_adopter: true, adopter_number: totalPaidSubs + 1 },
      });

      return NextResponse.json({ earlyAdopter: true, subscription: data });
    } else {
      const { data, error } = await adminDb
        .from('care_subscriptions')
        .insert({
          user_id: user.id,
          plan,
          status: 'active',
          payment_provider: 'early_adopter',
          current_period_start: now.toISOString().split('T')[0],
          current_period_end: periodEnd.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      writeAuditLog(supabase, {
        seniorId: user.id,
        actorId: user.id,
        eventType: 'subscription_changed',
        referenceType: 'care_subscriptions',
        referenceId: data.id,
        metadata: { old_plan: 'free', new_plan: plan, early_adopter: true, adopter_number: totalPaidSubs + 1 },
      });

      return NextResponse.json({ earlyAdopter: true, subscription: data });
    }
  }

  // Ab 200 Nutzer: Stripe Checkout
  if (!stripe) {
    return NextResponse.json(
      { error: 'Zahlungen sind derzeit nicht verfuegbar.' },
      { status: 503 }
    );
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
