// modules/care/services/medications.service.ts
// Nachbar.io — Medikamente Business Logic (list, create, get, update, deactivate)

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { writeAuditLog } from "@/lib/care/audit";
import { requireCareAccess } from "@/lib/care/api-helpers";
import {
  encryptFields,
  decryptFields,
  decryptFieldsArray,
  CARE_MEDICATIONS_ENCRYPTED_FIELDS,
} from "@/lib/care/field-encryption";
import { checkCareConsent } from "@/lib/care/consent";
import type { MedicationSchedule } from "@/lib/care/types";

// Felder die per PATCH aktualisiert werden dürfen
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "dosage",
  "schedule",
  "instructions",
  "active",
];

/**
 * Aktive Medikamente eines Seniors abrufen.
 * Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins.
 */
export async function listMedications(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string,
  includeInactive: boolean,
) {
  // Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
    }
  }

  let query = supabase
    .from("care_medications")
    .select("*")
    .eq("senior_id", seniorId)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[care/medications] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Medikamente konnten nicht geladen werden", 500);
  }

  // Medikamenten-Felder entschlüsseln (Art. 9 DSGVO)
  return decryptFieldsArray(data ?? [], CARE_MEDICATIONS_ENCRYPTED_FIELDS);
}

/**
 * Neues Medikament anlegen.
 * Prüft Einwilligung (Art. 9 DSGVO), validiert Eingaben, verschlüsselt und speichert.
 */
export async function createMedication(
  supabase: SupabaseClient,
  userId: string,
  body: {
    name?: string;
    dosage?: string;
    schedule?: MedicationSchedule;
    instructions?: string;
    senior_id?: string;
  },
) {
  // Art. 9 DSGVO: Einwilligung prüfen
  const hasConsent = await checkCareConsent(supabase, userId, "medications");
  if (!hasConsent) {
    throw new ServiceError(
      "Einwilligung erforderlich",
      403,
      "consent_required",
      {
        feature: "medications",
      },
    );
  }

  const { name, dosage, schedule, instructions, senior_id } = body;

  // Validierung
  if (
    !name ||
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 200
  ) {
    throw new ServiceError("Name muss 2-200 Zeichen lang sein", 400);
  }
  if (!schedule) {
    throw new ServiceError("Zeitplan ist erforderlich", 400);
  }
  if (
    instructions &&
    (typeof instructions !== "string" || instructions.length > 2000)
  ) {
    throw new ServiceError(
      "Anweisungen dürfen max. 2000 Zeichen lang sein",
      400,
    );
  }
  if (!["daily", "weekly", "interval"].includes(schedule.type)) {
    throw new ServiceError("Ungültiger Zeitplan-Typ", 400);
  }

  const targetSeniorId = senior_id ?? userId;

  // Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (targetSeniorId !== userId) {
    const role = await requireCareAccess(supabase, targetSeniorId);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
    }
  }

  // Medikamenten-Felder verschlüsseln (Art. 9 DSGVO)
  const insertData = encryptFields(
    {
      senior_id: targetSeniorId,
      name,
      dosage: dosage ?? null,
      schedule,
      instructions: instructions ?? null,
      managed_by: userId,
      active: true,
    },
    CARE_MEDICATIONS_ENCRYPTED_FIELDS,
  );

  const { data: medication, error: insertError } = await supabase
    .from("care_medications")
    .insert(insertData)
    .select()
    .single();

  if (insertError || !medication) {
    console.error(
      "[care/medications] Medikament konnte nicht erstellt werden:",
      insertError,
    );
    throw new ServiceError("Medikament konnte nicht angelegt werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: targetSeniorId,
    actorId: userId,
    eventType: "profile_updated",
    referenceType: "care_medications",
    referenceId: medication.id,
    metadata: { action: "created", name, schedule },
  }).catch(() => {});

  return medication;
}

/**
 * Einzelnes Medikament abrufen.
 * Zugriffsprüfung nach dem Laden (senior_id Vergleich).
 */
export async function getMedication(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("care_medications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ServiceError("Medikament nicht gefunden", 404);
    }
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // SICHERHEIT: Zugriffsprüfung — nur Senior selbst, zugeordnete Helfer oder Admin
  if (data.senior_id !== userId) {
    const role = await requireCareAccess(supabase, data.senior_id);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf dieses Medikament", 403);
    }
  }

  // Medikamenten-Felder entschlüsseln (Art. 9 DSGVO)
  return decryptFields(data, CARE_MEDICATIONS_ENCRYPTED_FIELDS);
}

/**
 * Medikament aktualisieren.
 * Nur erlaubte Felder, Zugriffsprüfung, Verschlüsselung, Audit-Log.
 */
export async function updateMedication(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine aenderbaren Felder angegeben", 400);
  }

  // SICHERHEIT: Zugriffsprüfung vor dem Update
  const { data: existing } = await supabase
    .from("care_medications")
    .select("senior_id")
    .eq("id", id)
    .single();

  if (!existing) {
    throw new ServiceError("Medikament nicht gefunden", 404);
  }
  if (existing.senior_id !== userId) {
    const role = await requireCareAccess(supabase, existing.senior_id);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf dieses Medikament", 403);
    }
  }

  // Medikamenten-Felder verschlüsseln (Art. 9 DSGVO)
  const encryptedUpdates = encryptFields(
    updates,
    CARE_MEDICATIONS_ENCRYPTED_FIELDS,
  );

  const { data: medication, error } = await supabase
    .from("care_medications")
    .update(encryptedUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[care/medications] Update fehlgeschlagen:", error);
    throw new ServiceError("Medikament konnte nicht aktualisiert werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: medication.senior_id,
    actorId: userId,
    eventType: "profile_updated",
    referenceType: "care_medications",
    referenceId: id,
    metadata: {
      action: updates.active === false ? "deactivated" : "updated",
      changes: Object.keys(updates),
    },
  }).catch(() => {});

  // Entschlüsselt zurückgeben
  return decryptFields(medication, CARE_MEDICATIONS_ENCRYPTED_FIELDS);
}

/**
 * Medikament deaktivieren (soft delete).
 * Setzt active=false, schreibt Audit-Log.
 */
export async function deactivateMedication(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  // SICHERHEIT: Zugriffsprüfung vor dem Deaktivieren
  const { data: existingMed } = await supabase
    .from("care_medications")
    .select("senior_id")
    .eq("id", id)
    .single();

  if (!existingMed) {
    throw new ServiceError("Medikament nicht gefunden", 404);
  }
  if (existingMed.senior_id !== userId) {
    const role = await requireCareAccess(supabase, existingMed.senior_id);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf dieses Medikament", 403);
    }
  }

  const { data: medication, error } = await supabase
    .from("care_medications")
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new ServiceError("Medikament konnte nicht deaktiviert werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: medication.senior_id,
    actorId: userId,
    eventType: "profile_updated",
    referenceType: "care_medications",
    referenceId: id,
    metadata: { action: "deactivated" },
  }).catch(() => {});

  return { success: true };
}
