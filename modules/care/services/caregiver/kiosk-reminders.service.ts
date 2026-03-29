// modules/care/services/caregiver/kiosk-reminders.service.ts
// Nachbar.io — Kiosk-Erinnerungen: CRUD-Operationen (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { careLog } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";

const MAX_TITLE_LENGTH = 80;
const MAX_REMINDERS_LIMIT = 50;
const VALID_TYPES = ["appointment", "sticky"] as const;

// ---------- listKioskReminders ----------

export async function listKioskReminders(
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
): Promise<{ reminders: Record<string, unknown>[] }> {
  if (!householdId) {
    throw new ServiceError("household_id ist erforderlich", 400);
  }

  // Zugriffspruefung: Caregiver-Link ODER Haushaltsmitglied
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  const { data: member } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!link && !member) {
    throw new ServiceError("Kein Zugriff", 403);
  }

  // Erinnerungen laden: neueste zuerst
  const { data: reminders, error } = await supabase
    .from("kiosk_reminders")
    .select(
      "id, household_id, created_by, type, title, scheduled_at, acknowledged_at, expires_at, created_at",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(MAX_REMINDERS_LIMIT);

  if (error) {
    throw new ServiceError("Erinnerungen konnten nicht geladen werden", 500);
  }

  return { reminders: reminders ?? [] };
}

// ---------- createKioskReminder ----------

export interface CreateKioskReminderInput {
  household_id: string;
  type: string;
  title: string;
  scheduled_at?: string;
}

export async function createKioskReminder(
  supabase: SupabaseClient,
  userId: string,
  input: CreateKioskReminderInput,
): Promise<{ reminder: Record<string, unknown> }> {
  const { household_id, type, title, scheduled_at } = input;

  // Pflichtfelder pruefen
  if (!household_id || !type || !title) {
    throw new ServiceError(
      "household_id, type und title sind erforderlich",
      400,
    );
  }

  // Typ validieren
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    throw new ServiceError("type muss 'appointment' oder 'sticky' sein", 400);
  }

  // Titel-Laenge validieren
  if (title.length < 1 || title.length > MAX_TITLE_LENGTH) {
    throw new ServiceError(
      `Titel muss zwischen 1 und ${MAX_TITLE_LENGTH} Zeichen lang sein`,
      400,
    );
  }

  // Termine brauchen scheduled_at
  if (type === "appointment" && !scheduled_at) {
    throw new ServiceError(
      "Termine (appointment) benötigen ein scheduled_at Datum",
      400,
    );
  }

  // scheduled_at validieren falls angegeben
  if (scheduled_at && isNaN(Date.parse(scheduled_at))) {
    throw new ServiceError("scheduled_at ist kein gültiges Datum", 400);
  }

  // Zugriffspruefung: Caregiver-Link + Bewohner im Haushalt
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, resident_id")
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!link) {
    throw new ServiceError("Kein Zugriff als Angehöriger", 403);
  }

  const { data: memberCheck } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", household_id)
    .eq("user_id", link.resident_id)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!memberCheck) {
    throw new ServiceError("Bewohner gehört nicht zu diesem Haushalt", 403);
  }

  // expires_at berechnen: Termine = scheduled_at + 1h, Sticky = null
  let expiresAt: string | null = null;
  if (type === "appointment" && scheduled_at) {
    const expires = new Date(scheduled_at);
    expires.setTime(expires.getTime() + 60 * 60 * 1000); // +1 Stunde
    expiresAt = expires.toISOString();
  }

  // Erinnerung anlegen
  const { data: reminder, error } = await supabase
    .from("kiosk_reminders")
    .insert({
      household_id,
      created_by: userId,
      type,
      title,
      scheduled_at: scheduled_at ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError("Erinnerung konnte nicht erstellt werden", 500);
  }

  careLog("kiosk-reminders", "create", {
    userId,
    reminderId: reminder.id,
    householdId: household_id,
    type,
  });

  return { reminder };
}

// ---------- updateKioskReminder ----------

export interface UpdateKioskReminderInput {
  title?: string;
  scheduled_at?: string | null;
}

export async function updateKioskReminder(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
  input: UpdateKioskReminderInput,
): Promise<{ reminder: Record<string, unknown> }> {
  // Validierung: mindestens ein Feld muss gesetzt sein
  if (input.title === undefined && input.scheduled_at === undefined) {
    throw new ServiceError(
      "Mindestens ein Feld (title, scheduled_at) ist erforderlich",
      400,
    );
  }

  // Titel-Laenge validieren falls angegeben
  if (
    input.title !== undefined &&
    (input.title.length < 1 || input.title.length > MAX_TITLE_LENGTH)
  ) {
    throw new ServiceError(
      `Titel muss zwischen 1 und ${MAX_TITLE_LENGTH} Zeichen lang sein`,
      400,
    );
  }

  // scheduled_at validieren falls angegeben
  if (
    input.scheduled_at !== undefined &&
    input.scheduled_at !== null &&
    isNaN(Date.parse(input.scheduled_at))
  ) {
    throw new ServiceError("scheduled_at ist kein gültiges Datum", 400);
  }

  // Erinnerung laden und Besitz pruefen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_reminders")
    .select("id, created_by, type")
    .eq("id", reminderId)
    .single();

  if (fetchError || !existing) {
    throw new ServiceError("Erinnerung nicht gefunden", 404);
  }

  if (existing.created_by !== userId) {
    throw new ServiceError(
      "Nur eigene Erinnerungen können bearbeitet werden",
      403,
    );
  }

  // Update-Objekt zusammenbauen (nur gesetzte Felder)
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.scheduled_at !== undefined) {
    updates.scheduled_at = input.scheduled_at;

    // expires_at neu berechnen fuer Termine
    if (existing.type === "appointment" && input.scheduled_at) {
      const expires = new Date(input.scheduled_at);
      expires.setTime(expires.getTime() + 60 * 60 * 1000); // +1 Stunde
      updates.expires_at = expires.toISOString();
    } else if (input.scheduled_at === null) {
      updates.expires_at = null;
    }
  }

  const { data: reminder, error: updateError } = await supabase
    .from("kiosk_reminders")
    .update(updates)
    .eq("id", reminderId)
    .select()
    .single();

  if (updateError) {
    throw new ServiceError("Erinnerung konnte nicht aktualisiert werden", 500);
  }

  careLog("kiosk-reminders", "update", {
    userId,
    reminderId,
    fields: Object.keys(updates),
  });

  return { reminder };
}

// ---------- deleteKioskReminder ----------

export async function deleteKioskReminder(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
): Promise<{ deleted: true }> {
  // Erinnerung laden und Besitz pruefen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_reminders")
    .select("id, created_by")
    .eq("id", reminderId)
    .single();

  if (fetchError || !existing) {
    throw new ServiceError("Erinnerung nicht gefunden", 404);
  }

  if (existing.created_by !== userId) {
    throw new ServiceError(
      "Nur eigene Erinnerungen können gelöscht werden",
      403,
    );
  }

  const { error: deleteError } = await supabase
    .from("kiosk_reminders")
    .delete()
    .eq("id", reminderId);

  if (deleteError) {
    throw new ServiceError("Erinnerung konnte nicht gelöscht werden", 500);
  }

  careLog("kiosk-reminders", "delete", {
    userId,
    reminderId,
  });

  return { deleted: true };
}
