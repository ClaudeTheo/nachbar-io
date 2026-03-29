// modules/care/services/subscriptions.service.ts
// Nachbar.io — Abo-Verwaltung Business-Logik: Laden, Erstellen/Ändern, Status-Änderung

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { PLAN_HIERARCHY } from "@/lib/care/billing";
import { ServiceError } from "@/lib/services/service-error";
import type { CareSubscriptionPlan } from "@/lib/care/types";

// --- Konstanten ---

const TRIAL_DAYS = 14;

// --- Service-Funktionen ---

/**
 * Aktuelles Abo laden (GET /api/care/subscriptions)
 */
export async function getSubscription(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("care_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new ServiceError(error.message, 500);

  // Kein Abo = virtuelles Free-Abo
  if (!data) {
    return {
      id: null,
      user_id: userId,
      plan: "free",
      status: "active",
      trial_ends_at: null,
      current_period_start: null,
      current_period_end: null,
      payment_provider: null,
      external_subscription_id: null,
      created_at: null,
      updated_at: null,
    };
  }

  return data;
}

/**
 * Abo erstellen oder Plan ändern (POST /api/care/subscriptions)
 * Body: { plan: CareSubscriptionPlan }
 */
export async function updateSubscription(
  supabase: SupabaseClient,
  userId: string,
  body: { plan?: string },
) {
  const { plan } = body;
  if (!plan || !PLAN_HIERARCHY.includes(plan as CareSubscriptionPlan)) {
    throw new ServiceError("Ungültiger Plan", 400);
  }

  // Bestehendes Abo prüfen
  const { data: existing } = await supabase
    .from("care_subscriptions")
    .select("id, plan")
    .eq("user_id", userId)
    .maybeSingle();

  const oldPlan = existing?.plan ?? "free";
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (existing) {
    // Plan ändern
    const { data, error } = await supabase
      .from("care_subscriptions")
      .update({
        plan,
        status: "active",
        current_period_start: now.toISOString().split("T")[0],
        current_period_end: periodEnd.toISOString().split("T")[0],
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new ServiceError(error.message, 500);

    // Audit-Log
    writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "subscription_changed",
      referenceType: "care_subscriptions",
      referenceId: data.id,
      metadata: { old_plan: oldPlan, new_plan: plan },
    });

    return { data, status: 200 };
  } else {
    // Neues Abo erstellen mit Trial für bezahlte Pläne
    const trialEndsAt =
      plan !== "free"
        ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data, error } = await supabase
      .from("care_subscriptions")
      .insert({
        user_id: userId,
        plan,
        status: plan !== "free" ? "trial" : "active",
        trial_ends_at: trialEndsAt,
        current_period_start: now.toISOString().split("T")[0],
        current_period_end: periodEnd.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) throw new ServiceError(error.message, 500);

    // Audit-Log
    writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "subscription_changed",
      referenceType: "care_subscriptions",
      referenceId: data.id,
      metadata: {
        old_plan: "free",
        new_plan: plan,
        trial: plan !== "free",
      },
    });

    return { data, status: 201 };
  }
}

/**
 * Abo-Status ändern: kündigen oder reaktivieren (PATCH /api/care/subscriptions)
 * Body: { status: 'cancelled' | 'active' }
 */
export async function updateSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
  body: { status?: string },
) {
  const { status } = body;
  if (!status || !["cancelled", "active"].includes(status)) {
    throw new ServiceError(
      "Ungültiger Status (erlaubt: cancelled, active)",
      400,
    );
  }

  const { data: existing } = await supabase
    .from("care_subscriptions")
    .select("id, plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) throw new ServiceError("Kein Abo gefunden", 404);

  const { data, error } = await supabase
    .from("care_subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw new ServiceError(error.message, 500);

  // Audit-Log
  writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: "subscription_changed",
    referenceType: "care_subscriptions",
    referenceId: data.id,
    metadata: {
      action: status === "cancelled" ? "cancel" : "reactivate",
      plan: existing.plan,
    },
  });

  return data;
}
