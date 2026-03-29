// modules/care/services/medications-log.service.ts
// Nachbar.io — Service: Medikamenten-Einnahme protokollieren und Log abrufen

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { requireCareAccess } from "@/lib/care/api-helpers";
import { MEDICATION_DEFAULTS } from "@/lib/care/constants";
import { decryptField } from "@/lib/care/field-encryption";
import type { CareMedicationLogStatus } from "@/lib/care/types";

const VALID_LOG_STATUSES: CareMedicationLogStatus[] = [
  "taken",
  "skipped",
  "snoozed",
];

// Medikamenten-Einnahme protokollieren (Upsert + Audit + Benachrichtigung)
export async function logMedicationIntake(
  supabase: SupabaseClient,
  userId: string,
  body: {
    medication_id?: string;
    status?: CareMedicationLogStatus;
    scheduled_at?: string;
  },
) {
  const { medication_id, status, scheduled_at } = body;

  // Validierung
  if (!medication_id || !status || !scheduled_at) {
    throw new ServiceError(
      "medication_id, status und scheduled_at sind erforderlich",
      400,
    );
  }

  if (!VALID_LOG_STATUSES.includes(status)) {
    throw new ServiceError(`Ungültiger Status: ${status}`, 400);
  }

  const now = new Date().toISOString();
  const snoozedUntil =
    status === "snoozed"
      ? new Date(
          Date.now() + MEDICATION_DEFAULTS.snoozeMinutes * 60 * 1000,
        ).toISOString()
      : null;

  // Upsert: Aktualisiere vorhandenen Log oder erstelle neuen
  const { data: existing } = await supabase
    .from("care_medication_logs")
    .select("id")
    .eq("medication_id", medication_id)
    .eq("scheduled_at", scheduled_at)
    .maybeSingle();

  let logEntry;
  if (existing) {
    const { data, error } = await supabase
      .from("care_medication_logs")
      .update({
        status,
        confirmed_at: status === "taken" ? now : null,
        snoozed_until: snoozedUntil,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error)
      throw new ServiceError("Log konnte nicht aktualisiert werden", 500);
    logEntry = data;
  } else {
    const { data, error } = await supabase
      .from("care_medication_logs")
      .insert({
        medication_id,
        senior_id: userId,
        scheduled_at,
        status,
        confirmed_at: status === "taken" ? now : null,
        snoozed_until: snoozedUntil,
      })
      .select()
      .single();
    if (error) throw new ServiceError("Log konnte nicht erstellt werden", 500);
    logEntry = data;
  }

  // Audit-Log
  const auditEvent =
    status === "taken"
      ? "medication_taken"
      : status === "skipped"
        ? "medication_skipped"
        : "medication_snoozed";
  await writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: auditEvent,
    referenceType: "care_medication_logs",
    referenceId: logEntry.id,
    metadata: { medication_id, status },
  }).catch(() => {});

  // Bei "skipped": Angehörige benachrichtigen
  if (status === "skipped") {
    const { data: relatives } = await supabase
      .from("care_helpers")
      .select("user_id")
      .eq("role", "relative")
      .eq("verification_status", "verified")
      .contains("assigned_seniors", [userId]);

    if (relatives && relatives.length > 0) {
      const { data: med } = await supabase
        .from("care_medications")
        .select("name")
        .eq("id", medication_id)
        .single();

      // Medikamenten-Name entschlüsseln für Benachrichtigungstext
      const medName = med?.name ? decryptField(med.name) : null;

      for (const rel of relatives) {
        await sendCareNotification(supabase, {
          userId: rel.user_id,
          type: "care_medication_missed",
          title: "Medikament übersprungen",
          body: `${medName ?? "Ein Medikament"} wurde übersprungen.`,
          referenceId: logEntry.id,
          referenceType: "care_medication_logs",
          url: "/care/medications",
          channels: ["push", "in_app"],
        }).catch(() => {});
      }
    }
  }

  return logEntry;
}

// Medikamenten-Log-Historie abrufen
export async function getMedicationLog(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string,
  medicationId: string | null,
  limit: number,
) {
  // Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
  }

  let query = supabase
    .from("care_medication_logs")
    .select("*, medication:care_medications(name, dosage)")
    .eq("senior_id", seniorId)
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  if (medicationId) query = query.eq("medication_id", medicationId);

  const { data, error } = await query;
  if (error) throw new ServiceError("Log konnte nicht geladen werden", 500);

  // Verschlüsselte Medikamenten-Namen in der verschachtelten Relation entschlüsseln
  const decryptedData = (data ?? []).map((log: Record<string, unknown>) => {
    if (log.medication && typeof log.medication === "object") {
      const med = log.medication as Record<string, unknown>;
      return {
        ...log,
        medication: {
          ...med,
          name:
            typeof med.name === "string" ? decryptField(med.name) : med.name,
          dosage:
            typeof med.dosage === "string"
              ? decryptField(med.dosage)
              : med.dosage,
        },
      };
    }
    return log;
  });

  return decryptedData;
}
