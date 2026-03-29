// Nachbar.io — Appointments-Service
// Zentralisiert Business-Logik fuer Termin-Buchungen (Pro Medical).
// Extrahiert aus: api/appointments, api/appointments/[id]

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { encryptField, decryptField } from "@/lib/care/field-encryption";
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  checkSlotAvailability,
} from "@/lib/appointments";
import type { AppointmentStatus } from "@/lib/appointments";

// ============================================================
// Termine auflisten (GET /api/appointments)
// ============================================================

export interface ListAppointmentsParams {
  status?: string | null;
  upcoming?: boolean;
}

/**
 * Laedt alle Termine eines Nutzers (als Arzt oder Patient).
 * Notes werden entschluesselt zurueckgegeben.
 */
export async function listAppointments(
  supabase: SupabaseClient,
  userId: string,
  params: ListAppointmentsParams = {},
) {
  let query = supabase
    .from("appointments")
    .select("*")
    .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
    .order("scheduled_at", { ascending: true });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.upcoming !== false) {
    query = query.gte("scheduled_at", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("[appointments] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Termine konnten nicht geladen werden", 500);
  }

  // notes_encrypted entschluesseln fuer die Antwort
  const decrypted = (data ?? []).map((appointment) => ({
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  }));

  return decrypted;
}

// ============================================================
// Termin erstellen (POST /api/appointments)
// ============================================================

/**
 * Erstellt einen neuen Termin mit Slot-Verfuegbarkeitspruefung und verschluesselten Notizen.
 */
export async function createAppointment(
  supabase: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  // Validierung
  const validation = validateAppointmentCreate(body);
  if (!validation.valid) {
    throw new ServiceError(validation.error!, 400);
  }

  const doctorId = body.doctor_id as string;
  const scheduledAt = body.scheduled_at as string;
  const durationMinutes = (body.duration_minutes as number) ?? 30;
  const type = (body.type as string) ?? "video";
  const notes = body.notes as string | undefined;
  const patientName = body.patient_name as string | undefined;
  const patientEmail = body.patient_email as string | undefined;
  const patientPhone = body.patient_phone as string | undefined;

  // Slot-Verfuegbarkeit pruefen (keine Ueberlappung)
  const slotCheck = await checkSlotAvailability(
    supabase,
    doctorId,
    scheduledAt,
    durationMinutes,
  );
  if (!slotCheck.available) {
    throw new ServiceError(slotCheck.error!, 409);
  }

  // Termin anlegen — notes verschluesseln (Art. 9 DSGVO)
  const insertData = {
    doctor_id: doctorId,
    patient_id: userId,
    patient_name: patientName ?? null,
    patient_email: patientEmail ?? null,
    patient_phone: patientPhone ?? null,
    scheduled_at: scheduledAt,
    duration_minutes: durationMinutes,
    type,
    status: "booked",
    notes_encrypted: encryptField(notes ?? null),
    meeting_url: null,
    reminder_sent: false,
  };

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert(insertData)
    .select()
    .single();

  if (insertError || !appointment) {
    console.error(
      "[appointments] Termin konnte nicht erstellt werden:",
      insertError,
    );
    throw new ServiceError("Termin konnte nicht angelegt werden", 500);
  }

  // Entschluesselt zurueckgeben
  return {
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  };
}

// ============================================================
// Einzelnen Termin abrufen (GET /api/appointments/[id])
// ============================================================

/**
 * Laedt einen einzelnen Termin. Nur Arzt oder Patient duerfen zugreifen.
 */
export async function getAppointment(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ServiceError("Termin nicht gefunden", 404);
    }
    console.error("[appointments] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // Zugriffspruefung: Nur Arzt oder Patient duerfen den Termin sehen
  if (data.doctor_id !== userId && data.patient_id !== userId) {
    throw new ServiceError("Kein Zugriff auf diesen Termin", 403);
  }

  return {
    ...data,
    notes_encrypted: decryptField(data.notes_encrypted),
  };
}

// ============================================================
// Termin aktualisieren (PATCH /api/appointments/[id])
// ============================================================

/**
 * Aktualisiert einen Termin. Nur der Arzt darf den Status aendern.
 */
export async function updateAppointment(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
  body: Record<string, unknown>,
) {
  // Bestehenden Termin laden
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ServiceError("Termin nicht gefunden", 404);
    }
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // Zugriffspruefung: Nur der Arzt darf den Status aendern
  if (existing.doctor_id !== userId) {
    throw new ServiceError("Nur der Arzt darf den Termin aktualisieren", 403);
  }

  // Validierung: Status-Uebergang pruefen
  const validation = validateAppointmentUpdate(
    {
      status: body.status as string,
      notes: body.notes as string,
      meeting_url: body.meeting_url as string,
    },
    existing.status as AppointmentStatus,
  );
  if (!validation.valid) {
    throw new ServiceError(validation.error!, 400);
  }

  // Update-Objekt zusammenbauen
  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.meeting_url !== undefined) updates.meeting_url = body.meeting_url;
  if (body.notes !== undefined) {
    // Notizen verschluesseln (Art. 9 DSGVO)
    updates.notes_encrypted = encryptField(body.notes as string);
  }

  const { data: appointment, error: updateError } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)
    .select()
    .single();

  if (updateError) {
    console.error("[appointments] Update fehlgeschlagen:", updateError);
    throw new ServiceError("Termin konnte nicht aktualisiert werden", 500);
  }

  return {
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  };
}

// ============================================================
// Termin absagen (DELETE /api/appointments/[id])
// ============================================================

/**
 * Sagt einen Termin ab (Soft Delete: status → cancelled).
 * Arzt oder Patient duerfen absagen.
 */
export async function cancelAppointment(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
) {
  // Bestehenden Termin laden
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("id, doctor_id, patient_id, status")
    .eq("id", appointmentId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ServiceError("Termin nicht gefunden", 404);
    }
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // Zugriffspruefung: Nur Arzt oder Patient duerfen absagen
  if (existing.doctor_id !== userId && existing.patient_id !== userId) {
    throw new ServiceError("Kein Zugriff auf diesen Termin", 403);
  }

  // Pruefen ob Termin bereits abgesagt ist
  if (existing.status === "cancelled") {
    throw new ServiceError("Termin ist bereits abgesagt", 400);
  }

  // Soft Delete: Status auf 'cancelled' setzen
  const { data: appointment, error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .select()
    .single();

  if (updateError) {
    console.error("[appointments] Absage fehlgeschlagen:", updateError);
    throw new ServiceError("Termin konnte nicht abgesagt werden", 500);
  }

  return {
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  };
}
