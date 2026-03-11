// app/api/care/subscriptions/route.ts
// Nachbar.io — Abo-Verwaltungs-API

import { requireAuth, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import { writeAuditLog } from '@/lib/care/audit';
import { PLAN_HIERARCHY } from '@/lib/care/billing';
import type { CareSubscriptionPlan } from '@/lib/care/types';

const TRIAL_DAYS = 14;

/**
 * GET /api/care/subscriptions
 * Aktuelles Abo des eingeloggten Users laden.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from('care_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);

  // Kein Abo = virtuelles Free-Abo
  if (!data) {
    return successResponse({
      id: null,
      user_id: user.id,
      plan: 'free',
      status: 'active',
      trial_ends_at: null,
      current_period_start: null,
      current_period_end: null,
      payment_provider: null,
      external_subscription_id: null,
      created_at: null,
      updated_at: null,
    });
  }

  return successResponse(data);
}

/**
 * POST /api/care/subscriptions
 * Abo erstellen oder Plan aendern.
 * Body: { plan: CareSubscriptionPlan }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase, user } = auth;

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungueltiger Request-Body', 400);
  }

  const { plan } = body;
  if (!plan || !PLAN_HIERARCHY.includes(plan as CareSubscriptionPlan)) {
    return errorResponse('Ungueltiger Plan', 400);
  }

  careLog('subscriptions', 'change', { userId: user.id, newPlan: plan });

  // Bestehendes Abo pruefen
  const { data: existing } = await supabase
    .from('care_subscriptions')
    .select('id, plan')
    .eq('user_id', user.id)
    .maybeSingle();

  const oldPlan = existing?.plan ?? 'free';
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (existing) {
    // Plan aendern
    const { data, error } = await supabase
      .from('care_subscriptions')
      .update({
        plan,
        status: 'active',
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
        updated_at: now.toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    // Audit-Log
    writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'subscription_changed',
      referenceType: 'care_subscriptions',
      referenceId: data.id,
      metadata: { old_plan: oldPlan, new_plan: plan },
    });

    return successResponse(data);
  } else {
    // Neues Abo erstellen mit Trial fuer bezahlte Plaene
    const trialEndsAt = plan !== 'free'
      ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('care_subscriptions')
      .insert({
        user_id: user.id,
        plan,
        status: plan !== 'free' ? 'trial' : 'active',
        trial_ends_at: trialEndsAt,
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    // Audit-Log
    writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'subscription_changed',
      referenceType: 'care_subscriptions',
      referenceId: data.id,
      metadata: { old_plan: 'free', new_plan: plan, trial: plan !== 'free' },
    });

    return successResponse(data, 201);
  }
}

/**
 * PATCH /api/care/subscriptions
 * Abo-Status aendern (kuendigen, reaktivieren).
 * Body: { status: 'cancelled' | 'active' }
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase, user } = auth;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungueltiger Request-Body', 400);
  }

  const { status } = body;
  if (!status || !['cancelled', 'active'].includes(status)) {
    return errorResponse('Ungueltiger Status (erlaubt: cancelled, active)', 400);
  }

  const { data: existing } = await supabase
    .from('care_subscriptions')
    .select('id, plan, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) return errorResponse('Kein Abo gefunden', 404);

  careLog('subscriptions', 'status_change', { userId: user.id, oldStatus: existing.status, newStatus: status });

  const { data, error } = await supabase
    .from('care_subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  // Audit-Log
  writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: 'subscription_changed',
    referenceType: 'care_subscriptions',
    referenceId: data.id,
    metadata: { action: status === 'cancelled' ? 'cancel' : 'reactivate', plan: existing.plan },
  });

  return successResponse(data);
}
