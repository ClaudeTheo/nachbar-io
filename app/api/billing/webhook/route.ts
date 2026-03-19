// POST /api/billing/webhook
// Stripe Webhook Handler — verarbeitet Abo-Events
// Behandelt: checkout.session.completed, invoice.paid, customer.subscription.deleted
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import type { PaidPlan } from '@/lib/stripe';
import type Stripe from 'stripe';

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
      const plan = session.metadata?.plan as PaidPlan | undefined;
      const quarterId = session.metadata?.quarter_id;
      const role = session.metadata?.role;

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

      if (error) {
        console.error('Subscription-Update Fehler:', error);
        break;
      }

      // Rolle in users-Tabelle setzen basierend auf Plan
      const roleMap: Record<string, string> = {
        plus: 'caregiver',
        pro_community: 'org_admin',
        pro_medical: 'doctor',
      };

      const newRole = roleMap[plan];
      if (newRole) {
        const { error: roleError } = await adminDb
          .from('users')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (roleError) console.error('Rollen-Update Fehler:', roleError);
      }

      // Pro Community: org_member erstellen mit Quartier-Zuweisung
      if (plan === 'pro_community' && quarterId) {
        const { data: existingMember } = await adminDb
          .from('org_members')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingMember) {
          const { error: orgError } = await adminDb
            .from('org_members')
            .insert({
              user_id: userId,
              role: 'admin',
              assigned_quarters: [quarterId],
            });

          if (orgError) console.error('org_member Erstellung Fehler:', orgError);
        }
      }

      // Pro Medical: doctor_profile erstellen
      if (plan === 'pro_medical' || role === 'doctor') {
        const { data: existingProfile } = await adminDb
          .from('doctor_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingProfile) {
          const { error: docError } = await adminDb
            .from('doctor_profiles')
            .insert({
              user_id: userId,
              status: 'pending_verification',
            });

          if (docError) console.error('doctor_profile Erstellung Fehler:', docError);
        }
      }

      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe v20 hat subscription als string|Subscription
      const sub = (invoice as any).subscription;
      const subscriptionId = (typeof sub === 'string' ? sub : sub?.id) as string;
      if (!subscriptionId) break;

      // Abrechnungszeitraum aktualisieren, Status auf active setzen (Verlaengerung)
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

      // Downgrade auf Free: Rolle zuruecksetzen, aber Daten behalten
      const { data: subData } = await adminDb
        .from('care_subscriptions')
        .select('user_id')
        .eq('external_subscription_id', subscription.id)
        .maybeSingle();

      const { error } = await adminDb
        .from('care_subscriptions')
        .update({
          status: 'cancelled',
          plan: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('external_subscription_id', subscription.id);

      if (error) console.error('Subscription-Kuendigung Fehler:', error);

      // Rolle auf 'user' zuruecksetzen (Daten bleiben erhalten, nur Zugriff entfernt)
      if (subData?.user_id) {
        const { error: roleError } = await adminDb
          .from('users')
          .update({ role: 'user', updated_at: new Date().toISOString() })
          .eq('id', subData.user_id);

        if (roleError) console.error('Rollen-Downgrade Fehler:', roleError);
      }

      break;
    }

    default:
      // Unbekannte Events ignorieren
      break;
  }

  return NextResponse.json({ received: true });
}
