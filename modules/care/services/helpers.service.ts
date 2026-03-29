// modules/care/services/helpers.service.ts
// Nachbar.io — Helfer-Verwaltung (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { requireCareAccess } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";
import type { CareHelperRole } from "@/lib/care/types";

const VALID_ROLES: CareHelperRole[] = ["neighbor", "relative", "care_service"];

// --- Interfaces ---

export interface ListHelpersInput {
  seniorId?: string | null;
  role?: string | null;
  status?: string | null;
}

export interface RegisterHelperInput {
  role?: CareHelperRole;
  skills?: string[];
  availability?: Record<string, unknown>;
  senior_ids?: string[];
}

export interface UpdateHelperInput {
  verification_status?: string;
  assigned_seniors?: string[];
  skills?: string[];
  availability?: Record<string, unknown>;
  role?: string;
}

// --- Service-Funktionen ---

/**
 * Helfer auflisten (GET /api/care/helpers)
 */
export async function listHelpers(
  supabase: SupabaseClient,
  userId: string,
  input: ListHelpersInput,
): Promise<unknown[]> {
  const { seniorId, role, status: rawStatus } = input;
  const status = rawStatus ?? "verified";

  let query = supabase
    .from("care_helpers")
    .select("*, user:users!care_helpers_user_id_fkey(display_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("verification_status", status);
  if (role) query = query.eq("role", role);

  if (seniorId) {
    // Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins
    if (seniorId !== userId) {
      const careRole = await requireCareAccess(supabase, seniorId);
      if (!careRole)
        throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
    }
    query = query.contains("assigned_seniors", [seniorId]);
  } else {
    // SICHERHEIT (M2): Ohne senior_id nur eigene Helfer-Daten oder Admin sieht alle
    const { data: adminCheck } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single();
    if (!adminCheck?.is_admin) {
      // Nicht-Admins sehen nur sich selbst oder Helfer die ihnen zugeordnet sind
      query = query.or(`user_id.eq.${userId},assigned_seniors.cs.{${userId}}`);
    }
  }

  const { data, error } = await query;
  if (error) throw new ServiceError("Helfer konnten nicht geladen werden", 500);

  return data ?? [];
}

/**
 * Als Helfer registrieren (POST /api/care/helpers)
 */
export async function registerHelper(
  supabase: SupabaseClient,
  userId: string,
  input: RegisterHelperInput,
): Promise<unknown> {
  const { role, skills = [], availability, senior_ids = [] } = input;

  if (!role || !VALID_ROLES.includes(role)) {
    throw new ServiceError(
      `Ungültige Rolle: ${role}. Erlaubt: ${VALID_ROLES.join(", ")}`,
      400,
    );
  }

  // Prüfen ob bereits registriert
  const { data: existing } = await supabase
    .from("care_helpers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    throw new ServiceError("Sie sind bereits als Helfer registriert", 409);
  }

  const { data: helper, error: insertError } = await supabase
    .from("care_helpers")
    .insert({
      user_id: userId,
      role,
      verification_status: "pending",
      assigned_seniors: senior_ids,
      skills,
      availability: availability ?? null,
    })
    .select("*, user:users!care_helpers_user_id_fkey(display_name, avatar_url)")
    .single();

  if (insertError || !helper) {
    console.error("[care/helpers] Registrierung fehlgeschlagen:", insertError);
    throw new ServiceError("Registrierung fehlgeschlagen", 500);
  }

  for (const seniorId of senior_ids) {
    await writeAuditLog(supabase, {
      seniorId,
      actorId: userId,
      eventType: "helper_registered",
      referenceType: "care_helpers",
      referenceId: helper.id,
      metadata: { role, skills },
    }).catch(() => {});
  }

  return helper;
}

/**
 * Helfer-Details laden (GET /api/care/helpers/[id])
 */
export async function getHelper(
  supabase: SupabaseClient,
  _userId: string,
  helperId: string,
): Promise<unknown> {
  const { data, error } = await supabase
    .from("care_helpers")
    .select("*, user:users!care_helpers_user_id_fkey(display_name, avatar_url)")
    .eq("id", helperId)
    .single();

  if (error) {
    if (error.code === "PGRST116")
      throw new ServiceError("Helfer nicht gefunden", 404);
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  return data;
}

/**
 * Helfer verifizieren / aktualisieren (PATCH /api/care/helpers/[id])
 * Enthält Ownership-Prüfung und Admin-Gate für sicherheitskritische Felder.
 */
export async function updateHelper(
  supabase: SupabaseClient,
  userId: string,
  helperId: string,
  input: UpdateHelperInput,
): Promise<unknown> {
  const allowedFields = [
    "verification_status",
    "assigned_seniors",
    "skills",
    "availability",
    "role",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in input) updates[key] = input[key as keyof UpdateHelperInput];
  }

  // Helfer laden um Ownership zu prüfen
  const { data: existingHelper } = await supabase
    .from("care_helpers")
    .select("user_id")
    .eq("id", helperId)
    .single();

  if (!existingHelper) {
    throw new ServiceError("Helfer nicht gefunden", 404);
  }

  // Admin-Status prüfen
  const { data: adminCheck } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = adminCheck?.is_admin === true;

  // SICHERHEIT: Nur eigenes Profil oder Admin darf ändern
  if (existingHelper.user_id !== userId && !isAdmin) {
    throw new ServiceError("Kein Zugriff auf dieses Helfer-Profil", 403);
  }

  // Sicherheitskritische Felder nur für Admins
  if (
    (updates.verification_status || updates.role || updates.assigned_seniors) &&
    !isAdmin
  ) {
    throw new ServiceError(
      "Nur Admins können Verifizierung, Rollen oder Senior-Zuordnungen ändern",
      403,
    );
  }

  if (updates.verification_status === "verified") {
    updates.verified_by = userId;
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine aenderbaren Felder", 400);
  }

  const { data: helper, error } = await supabase
    .from("care_helpers")
    .update(updates)
    .eq("id", helperId)
    .select("*, user:users!care_helpers_user_id_fkey(display_name, avatar_url)")
    .single();

  if (error) throw new ServiceError("Aktualisierung fehlgeschlagen", 500);

  if (updates.verification_status === "verified") {
    await sendCareNotification(supabase, {
      userId: helper.user_id,
      type: "care_helper_verified",
      title: "Helfer-Verifizierung",
      body: "Sie wurden als Helfer verifiziert. Sie können jetzt auf SOS-Alarme reagieren.",
      url: "/care",
      channels: ["push", "in_app"],
    }).catch(() => {});

    for (const seniorId of helper.assigned_seniors ?? []) {
      await writeAuditLog(supabase, {
        seniorId,
        actorId: userId,
        eventType: "helper_verified",
        referenceType: "care_helpers",
        referenceId: helperId,
        metadata: { role: helper.role },
      }).catch(() => {});
    }
  }

  return helper;
}
