// modules/care/services/appointments.service.ts
// Nachbar.io — Termin-Verwaltung Business-Logik: Auflisten, Erstellen, Lesen, Aktualisieren, Löschen

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import {
  encryptFields,
  decryptFields,
  decryptFieldsArray,
  CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
} from "@/lib/care/field-encryption";
import { requireCareAccess } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";
import type { CareAppointmentType } from "@/lib/care/types";

// --- Typen ---

interface ListAppointmentsParams {
  userId: string;
  seniorId?: string;
  upcoming?: boolean;
}

interface CreateAppointmentParams {
  userId: string;
  title: string;
  scheduled_at: string;
  type?: CareAppointmentType;
  duration_minutes?: number;
  location?: string;
  reminder_minutes_before?: number[];
  recurrence?: Record<string, unknown>;
  notes?: string;
  senior_id?: string;
}

interface UpdateAppointmentParams {
  userId: string;
  updates: Record<string, unknown>;
}

// --- Hilfsfunktion: Zugriffsprüfung ---

async function ensureCareAccess(
  supabase: SupabaseClient,
  seniorId: string,
  userId: string,
): Promise<void> {
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
  }
}

// --- Service-Funktionen ---

/**
 * Termine auflisten (GET /api/care/appointments)
 */
export async function listAppointments(
  supabase: SupabaseClient,
  params: ListAppointmentsParams,
) {
  const seniorId = params.seniorId ?? params.userId;
  const upcoming = params.upcoming !== false;

  await ensureCareAccess(supabase, seniorId, params.userId);

  let query = supabase
    .from("care_appointments")
    .select("*")
    .eq("senior_id", seniorId)
    .order("scheduled_at", { ascending: true });

  if (upcoming) {
    query = query.gte("scheduled_at", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("[care/appointments] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Termine konnten nicht geladen werden", 500);
  }

  // Termin-Felder entschlüsseln (Art. 9 DSGVO)
  try {
    return decryptFieldsArray(data ?? [], CARE_APPOINTMENTS_ENCRYPTED_FIELDS);
  } catch (decryptError) {
    console.error(
      "[care/appointments] Entschlüsselung fehlgeschlagen:",
      decryptError,
    );
    // Daten ohne Entschlüsselung zurückgeben damit die Seite nicht abstürzt
    return data ?? [];
  }
}

/**
 * Neuen Termin anlegen (POST /api/care/appointments)
 */
export async function createAppointment(
  supabase: SupabaseClient,
  params: CreateAppointmentParams,
) {
  const {
    userId,
    title,
    scheduled_at,
    type,
    duration_minutes,
    location,
    reminder_minutes_before,
    recurrence,
    notes,
    senior_id,
  } = params;

  if (!title || !scheduled_at) {
    throw new ServiceError("Titel und Termindatum sind erforderlich", 400);
  }

  const targetSeniorId = senior_id ?? userId;

  await ensureCareAccess(supabase, targetSeniorId, userId);

  // Termin-Felder verschlüsseln (Art. 9 DSGVO)
  const insertData = encryptFields(
    {
      senior_id: targetSeniorId,
      title,
      scheduled_at,
      type: type ?? "other",
      duration_minutes: duration_minutes ?? 60,
      location: location ?? null,
      reminder_minutes_before: reminder_minutes_before ?? [60, 15],
      recurrence: recurrence ?? null,
      notes: notes ?? null,
      managed_by: userId,
    },
    CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
  );

  const { data: appointment, error: insertError } = await supabase
    .from("care_appointments")
    .insert(insertData)
    .select()
    .single();

  if (insertError || !appointment) {
    console.error(
      "[care/appointments] Termin konnte nicht erstellt werden:",
      insertError,
    );
    throw new ServiceError("Termin konnte nicht angelegt werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: targetSeniorId,
    actorId: userId,
    eventType: "appointment_confirmed",
    referenceType: "care_appointments",
    referenceId: appointment.id,
    metadata: { action: "created", title, scheduled_at },
  }).catch(() => {});

  // Entschlüsselt zurückgeben
  return decryptFields(appointment, CARE_APPOINTMENTS_ENCRYPTED_FIELDS);
}

/**
 * Einzelnen Termin lesen (GET /api/care/appointments/[id])
 */
export async function getAppointment(
  supabase: SupabaseClient,
  id: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("care_appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116")
      throw new ServiceError("Termin nicht gefunden", 404);
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // SICHERHEIT: Zugriffsprüfung — nur Senior selbst, zugeordnete Helfer oder Admin
  await ensureCareAccess(supabase, data.senior_id, userId);

  // Termin-Felder entschlüsseln (Art. 9 DSGVO)
  return decryptFields(data, CARE_APPOINTMENTS_ENCRYPTED_FIELDS);
}

/**
 * Termin aktualisieren (PATCH /api/care/appointments/[id])
 */
export async function updateAppointment(
  supabase: SupabaseClient,
  id: string,
  params: UpdateAppointmentParams,
) {
  const { userId, updates: body } = params;

  const allowedFields = [
    "title",
    "type",
    "scheduled_at",
    "duration_minutes",
    "location",
    "reminder_minutes_before",
    "notes",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine aenderbaren Felder angegeben", 400);
  }

  // SICHERHEIT: Zugriffsprüfung vor dem Update
  const { data: existing } = await supabase
    .from("care_appointments")
    .select("senior_id")
    .eq("id", id)
    .single();
  if (!existing) throw new ServiceError("Termin nicht gefunden", 404);

  await ensureCareAccess(supabase, existing.senior_id, userId);

  // Termin-Felder verschlüsseln (Art. 9 DSGVO)
  const encryptedUpdates = encryptFields(
    updates,
    CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
  );

  const { data: appointment, error } = await supabase
    .from("care_appointments")
    .update(encryptedUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[care/appointments] Update fehlgeschlagen:", error);
    throw new ServiceError("Termin konnte nicht aktualisiert werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: appointment.senior_id,
    actorId: userId,
    eventType: "appointment_confirmed",
    referenceType: "care_appointments",
    referenceId: id,
    metadata: { action: "updated", changes: Object.keys(updates) },
  }).catch(() => {});

  // Entschlüsselt zurückgeben
  return decryptFields(appointment, CARE_APPOINTMENTS_ENCRYPTED_FIELDS);
}

/**
 * Termin endgültig löschen (DELETE /api/care/appointments/[id])
 */
export async function deleteAppointment(
  supabase: SupabaseClient,
  id: string,
  userId: string,
) {
  // senior_id vor dem Löschen für den Audit-Log sichern
  const { data: existing, error: fetchError } = await supabase
    .from("care_appointments")
    .select("senior_id")
    .eq("id", id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116")
      throw new ServiceError("Termin nicht gefunden", 404);
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // SICHERHEIT: Zugriffsprüfung vor dem Löschen
  await ensureCareAccess(supabase, existing.senior_id, userId);

  const { error: deleteError } = await supabase
    .from("care_appointments")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[care/appointments] Löschen fehlgeschlagen:", deleteError);
    throw new ServiceError("Termin konnte nicht gelöscht werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: existing.senior_id,
    actorId: userId,
    eventType: "appointment_missed",
    referenceType: "care_appointments",
    referenceId: id,
    metadata: { action: "deleted" },
  }).catch(() => {});

  return { success: true };
}
