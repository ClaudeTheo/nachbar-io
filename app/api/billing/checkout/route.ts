// POST /api/billing/checkout
// Erstellt eine Stripe Checkout Session — oder aktiviert kostenlos fuer Early Adopter
// Unterstuetzt alle Plan-Typen: plus, pro_community, pro_medical
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { stripe, getStripePriceId } from '@/lib/stripe';
import type { PaidPlan, BillingInterval } from '@/lib/stripe';
import { writeAuditLog } from '@/lib/care/audit';

// Service-Client fuer DB-Updates (umgeht RLS)
function getAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Gueltige bezahlte Plan-Typen
const VALID_PAID_PLANS: PaidPlan[] = ['plus', 'pro_community', 'pro_medical'];

// Erste 200 Nutzer bekommen alle Plaene kostenlos
const EARLY_ADOPTER_LIMIT = 200;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Abwaertskompatibilitaet: planType oder plan akzeptieren, interval oder billing_cycle
  const plan = (body.planType || body.plan) as PaidPlan;
  const interval = (body.interval || body.billing_cycle || 'monthly') as BillingInterval;
  const quarterId = body.quarterId as string | undefined;

  // Validierung: Nur gueltige bezahlte Plaene erlaubt
  if (!VALID_PAID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Ungueltiger Plan' }, { status: 400 });
  }

  // pro_community erfordert eine quarterId
  if (plan === 'pro_community' && !quarterId) {
    return NextResponse.json(
      { error: 'Pro Community erfordert eine Quartier-ID (quarterId)' },
      { status: 400 }
    );
  }

  // Early-Adopter-Pruefung: Anzahl bezahlter Abos zaehlen
  const adminDb = getAdminSupabase();
  const { count } = await adminDb
    .from('care_subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('plan', ['plus', 'pro_community', 'pro_medical'])
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

      if (error) return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });

      // Plan-spezifische Provisioning (auch fuer Early Adopter)
      await provisionPlanResources(adminDb, user.id, plan, quarterId);

      writeAuditLog(supabase, {
        seniorId: user.id,
        actorId: user.id,
        eventType: 'subscription_changed',
        referenceType: 'care_subscriptions',
        referenceId: data.id,
        metadata: { old_plan: existingSub.plan, new_plan: plan, early_adopter: true, adopter_number: totalPaidSubs + 1, quarterId },
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

      if (error) return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });

      // Plan-spezifische Provisioning (auch fuer Early Adopter)
      await provisionPlanResources(adminDb, user.id, plan, quarterId);

      writeAuditLog(supabase, {
        seniorId: user.id,
        actorId: user.id,
        eventType: 'subscription_changed',
        referenceType: 'care_subscriptions',
        referenceId: data.id,
        metadata: { old_plan: 'free', new_plan: plan, early_adopter: true, adopter_number: totalPaidSubs + 1, quarterId },
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

  const priceId = getStripePriceId(plan, interval);

  if (!priceId) {
    return NextResponse.json(
      { error: 'Preis-Konfiguration fehlt. Bitte kontaktieren Sie den Support.' },
      { status: 500 }
    );
  }

  try {
    const origin = request.nextUrl.origin;

    // Plan-spezifische Metadata fuer Webhook-Verarbeitung
    const metadata: Record<string, string> = {
      user_id: user.id,
      plan,
      billing_cycle: interval,
    };

    // Pro Community: Quartier-ID mitgeben fuer org_member Erstellung
    if (plan === 'pro_community' && quarterId) {
      metadata.quarter_id = quarterId;
    }

    // Pro Medical: Arzt-Rolle markieren fuer doctor_profile Erstellung
    if (plan === 'pro_medical') {
      metadata.role = 'doctor';
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata,
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

// Plan-spezifische Ressourcen erstellen (org_member, doctor_profile etc.)
// Wird von Checkout (Early Adopter) und Webhook (Stripe) aufgerufen
async function provisionPlanResources(
  adminDb: ReturnType<typeof getAdminSupabase>,
  userId: string,
  plan: PaidPlan,
  quarterId?: string
): Promise<void> {
  // Rolle in users-Tabelle aktualisieren
  const roleMap: Record<PaidPlan, string> = {
    plus: 'caregiver',
    pro_community: 'org_admin',
    pro_medical: 'doctor',
  };

  const newRole = roleMap[plan];
  if (newRole) {
    await adminDb
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }

  // Pro Community: org_member Eintrag erstellen
  if (plan === 'pro_community' && quarterId) {
    const { data: existingMember } = await adminDb
      .from('org_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingMember) {
      await adminDb
        .from('org_members')
        .insert({
          user_id: userId,
          role: 'admin',
          assigned_quarters: [quarterId],
        });
    }
  }

  // Pro Medical: doctor_profile erstellen (falls noch nicht vorhanden)
  if (plan === 'pro_medical') {
    const { data: existingProfile } = await adminDb
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await adminDb
        .from('doctor_profiles')
        .insert({
          user_id: userId,
          status: 'pending_verification',
        });
    }
  }
}

// Export fuer Tests und Webhook-Nutzung
export { provisionPlanResources, getAdminSupabase };
