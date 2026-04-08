// lib/care/api-helpers.ts
// Nachbar.io — Gemeinsame API-Hilfsfunktionen fuer das Care-Modul

import { NextResponse } from "next/server";
import type { SupabaseClient, AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { canAccessFeature, getCareRole } from "./permissions";
import type { CareUserRole, CareSubscriptionPlan, GateCode } from "./types";
import { PLAN_HIERARCHY } from "./billing";
import { hasFeature } from "./constants";

/** Standardisierte Fehler-Antwort mit Logging */
export function errorResponse(message: string, status: number) {
  console.error(`[care/api] ${status}: ${message}`);
  return NextResponse.json({ error: message }, { status });
}

/** Erfolgs-Antwort */
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Auth-Guard: gibt Supabase-Client + User zurueck oder null */
export async function requireAuth(): Promise<{
  supabase: SupabaseClient;
  user: AuthUser;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

/** Feature-Gate: prueft ob Feature im Abo-Plan verfuegbar */
export async function requireFeature(
  supabase: SupabaseClient,
  seniorId: string,
  feature: string,
): Promise<boolean> {
  return canAccessFeature(supabase, seniorId, feature);
}

/** Admin-Check: prueft ob User Admin ist */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return data?.is_admin === true;
}

/**
 * Care-Zugriffspruefung: Stellt sicher, dass der User berechtigt ist,
 * auf die Daten eines bestimmten Seniors zuzugreifen.
 * Gibt die Rolle zurueck oder null, wenn kein Zugriff.
 */
export async function requireCareAccess(
  supabase: SupabaseClient,
  seniorId: string,
): Promise<CareUserRole | null> {
  const role = await getCareRole(supabase, seniorId);
  if (role === "none") return null;
  return role;
}

/** Strukturiertes Care-Logging */
export function careLog(
  module: string,
  action: string,
  details?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    module: `care/${module}`,
    action,
    ...details,
  };
  console.log(JSON.stringify(logEntry));
}

/** Fehler-Logging mit Stack-Trace */
export function careError(
  module: string,
  action: string,
  error: unknown,
  details?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const logEntry = {
    timestamp,
    module: `care/${module}`,
    action,
    error: message,
    stack,
    ...details,
  };
  console.error(JSON.stringify(logEntry));
}

/** Einheitliche 403-Antwort fuer Feature-Gates */
export function featureGateResponse(
  code: GateCode,
  details: Record<string, string> = {},
): NextResponse {
  const messages: Record<GateCode, string> = {
    PLAN_REQUIRED: "Feature nicht verfügbar",
    ROLE_REQUIRED: "Unzureichende Berechtigung",
    TENANT_ACCESS_REQUIRED: "Kein Zugriff auf diese Organisation",
  };

  const body: Record<string, string> = {
    error: messages[code],
    code,
    ...details,
  };

  if (code === "PLAN_REQUIRED") {
    body.upgradeUrl = "/care/subscription";
  }

  careLog("gate", code, { ...details });
  return NextResponse.json(body, { status: 403 });
}

/** Abo-Guard: prueft ob User mindestens requiredPlan hat */
export async function requireSubscription(
  supabase: SupabaseClient,
  userId: string,
  requiredPlan: CareSubscriptionPlan,
  options?: { feature?: string },
): Promise<{ plan: CareSubscriptionPlan; status: string } | NextResponse> {
  const { data: subscription } = await supabase
    .from("care_subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  let plan: CareSubscriptionPlan;
  let status: string;

  if (subscription) {
    plan = subscription.plan;
    status = subscription.status;
  } else if (process.env.PILOT_MODE?.trim() === "true") {
    plan = "pro";
    status = "active";
    careLog("gate", "pilot_fallback", { userId });
  } else {
    plan = "free";
    status = "active";
  }

  // Abgelaufene/gekuendigte Abos blockieren
  const isActive = status === "active" || status === "trial";
  if (!isActive) {
    return featureGateResponse("PLAN_REQUIRED", {
      requiredPlan,
      reason: "subscription_inactive",
    });
  }

  // Plan-Hierarchie pruefen
  const currentIdx = PLAN_HIERARCHY.indexOf(plan);
  const requiredIdx = PLAN_HIERARCHY.indexOf(requiredPlan);
  if (currentIdx < requiredIdx) {
    return featureGateResponse("PLAN_REQUIRED", {
      requiredPlan,
      reason: "plan_insufficient",
    });
  }

  // Optionales Feature-Check
  if (options?.feature && !hasFeature(plan, options.feature)) {
    return featureGateResponse("PLAN_REQUIRED", {
      requiredPlan,
      reason: "feature_missing",
    });
  }

  return { plan, status };
}

/** Org-Zugriffs-Guard: prueft org_members-Eintrag */
export async function requireOrgAccess(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  minRole?: "admin",
): Promise<Record<string, unknown> | NextResponse> {
  const { data: member, error } = await supabase
    .from("org_members")
    .select("role, org_id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .single();

  if (error || !member) {
    return featureGateResponse("TENANT_ACCESS_REQUIRED");
  }

  if (minRole === "admin" && member.role !== "admin") {
    return featureGateResponse("ROLE_REQUIRED", { requiredRole: "admin" });
  }

  return member;
}

/** Arzt-Zugriffs-Guard: prueft doctor_profiles-Eintrag */
export async function requireDoctorAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | NextResponse> {
  const { data: profile } = await supabase
    .from("doctor_profiles")
    .select("user_id, visible")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    return featureGateResponse("ROLE_REQUIRED", { requiredRole: "doctor" });
  }

  return profile;
}

/** 401-Antwort fuer fehlende Auth */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Nicht authentifiziert", code: "UNAUTHORIZED" },
    { status: 401 },
  );
}
