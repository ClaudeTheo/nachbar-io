// modules/care/services/consultations.service.ts
// Nachbar.io — Online-Sprechstunde Business-Logik: Slots, Buchung, Status, Einwilligung, Verhandlung

import { SupabaseClient } from "@supabase/supabase-js";
import { createCareLogger } from "@/lib/care/logger";
import { encryptField, decryptFieldsArray } from "@/lib/care/field-encryption";
import {
  canTransition,
  type AppointmentStatus,
} from "@/lib/consultation/appointment-status";
import {
  sendAppointmentPush,
  sendAppointmentEmail,
} from "@/lib/consultation/notifications";
import { getProvider } from "@/lib/consultation/provider";
import { ServiceError } from "@/lib/services/service-error";
import type {
  ConsultationProviderType,
  ConsultationStatus,
} from "@/lib/care/types";

// --- Konstanten ---

const VALID_PROVIDER_TYPES: ConsultationProviderType[] = [
  "community",
  "medical",
];
const ENCRYPTED_FIELDS = ["notes"];

const ACTION_TO_STATUS: Record<string, AppointmentStatus> = {
  confirm: "confirmed",
  counter_propose: "counter_proposed",
  decline: "declined",
  cancel: "cancelled",
};

// Erlaubte Status-Übergänge (State-Machine)
const VALID_TRANSITIONS: Record<string, ConsultationStatus[]> = {
  scheduled: ["waiting", "cancelled"],
  waiting: ["active", "cancelled", "no_show"],
  active: ["completed"],
};

// --- Service-Funktionen ---

/**
 * Sprechstunden-Slots auflisten (GET /api/care/consultations)
 */
export async function listConsultationSlots(
  supabase: SupabaseClient,
  params: {
    userId: string;
    quarterId?: string | null;
    myOnly?: boolean;
  },
) {
  const log = createCareLogger("care/consultations/GET");

  let query = supabase
    .from("consultation_slots")
    .select("*")
    .order("scheduled_at", { ascending: true });

  if (params.quarterId) {
    query = query.eq("quarter_id", params.quarterId);
  }

  if (params.myOnly) {
    query = query.or(
      `booked_by.eq.${params.userId},host_user_id.eq.${params.userId}`,
    );
  }

  const { data, error } = await query;

  if (error) {
    log.error("db_error", error.message);
    log.done(500);
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  // Notizen nur für Host oder gebuchten Nutzer entschlüsseln
  const decrypted = (data ?? []).map((slot) => {
    if (
      slot.notes &&
      (slot.host_user_id === params.userId || slot.booked_by === params.userId)
    ) {
      return decryptFieldsArray([slot], ENCRYPTED_FIELDS)[0];
    }
    return { ...slot, notes: null };
  });

  log.done(200);
  return decrypted;
}

/**
 * Neuen Sprechstunden-Slot erstellen (POST /api/care/consultations)
 */
export async function createConsultationSlot(
  supabase: SupabaseClient,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
) {
  const log = createCareLogger("care/consultations/POST");

  // Validierung
  if (!body.quarter_id) {
    throw new ServiceError("quarter_id ist erforderlich", 400);
  }
  if (
    !body.provider_type ||
    !VALID_PROVIDER_TYPES.includes(body.provider_type)
  ) {
    throw new ServiceError(
      "provider_type muss community oder medical sein",
      400,
    );
  }
  if (!body.host_name?.trim()) {
    throw new ServiceError("host_name ist erforderlich", 400);
  }
  if (!body.scheduled_at || isNaN(Date.parse(body.scheduled_at))) {
    throw new ServiceError("scheduled_at muss ein gültiges Datum sein", 400);
  }
  const duration = body.duration_minutes ?? 15;
  if (duration < 5 || duration > 60) {
    throw new ServiceError(
      "duration_minutes muss zwischen 5 und 60 liegen",
      400,
    );
  }

  // join_url validieren (nur HTTPS, kein javascript: etc.)
  if (body.join_url) {
    try {
      const parsed = new URL(body.join_url);
      if (parsed.protocol !== "https:") {
        throw new ServiceError("join_url muss eine HTTPS-URL sein", 400);
      }
    } catch (e) {
      if (e instanceof ServiceError) throw e;
      throw new ServiceError("join_url ist keine gültige URL", 400);
    }
  }

  // Notizen verschlüsseln bei medizinischen Sprechstunden
  const notes = body.notes
    ? body.provider_type === "medical"
      ? encryptField(body.notes)
      : body.notes
    : null;

  const { data, error } = await supabase
    .from("consultation_slots")
    .insert([
      {
        quarter_id: body.quarter_id,
        provider_type: body.provider_type,
        host_user_id: userId,
        host_name: body.host_name.trim(),
        title: body.title?.trim() || "Sprechstunde",
        scheduled_at: body.scheduled_at,
        duration_minutes: duration,
        join_url: body.join_url || null,
        notes,
      },
    ])
    .select()
    .single();

  if (error) {
    log.error("insert_error", error.message);
    log.done(500);
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  log.info("slot_created", { slotId: data.id, type: body.provider_type });
  log.done(201);
  return data;
}

/**
 * Terminverhandlung: Bestätigen/Gegenvorschlag/Ablehnen (PATCH /api/care/consultations/[id])
 */
export async function negotiateConsultation(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  body: { action?: string; scheduled_at?: string },
) {
  const log = createCareLogger("care/consultations/PATCH");
  const { action, scheduled_at } = body;

  if (!action || !ACTION_TO_STATUS[action]) {
    log.done(400);
    throw new ServiceError("Ungültige Aktion", 400);
  }

  // Aktuellen Termin laden
  const { data: slot, error: fetchError } = await supabase
    .from("consultation_slots")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !slot) {
    log.done(404);
    throw new ServiceError("Termin nicht gefunden", 404);
  }

  // Prüfen ob Nutzer Patient dieses Termins ist
  if (slot.booked_by !== userId) {
    log.done(403);
    throw new ServiceError("Nicht berechtigt", 403);
  }

  // Rolle bestimmen: proposed_by zeigt auf den Vorschlagenden
  const actor = "patient" as const;
  const proposedBy =
    slot.proposed_by === slot.host_user_id ? "doctor" : "patient";
  const targetStatus = ACTION_TO_STATUS[action];

  if (
    !canTransition(
      slot.status as AppointmentStatus,
      targetStatus,
      actor,
      proposedBy,
    )
  ) {
    log.done(422);
    throw new ServiceError(
      `Übergang von ${slot.status} nach ${targetStatus} nicht erlaubt`,
      422,
    );
  }

  // Update vorbereiten
  const updateData: Record<string, unknown> = {
    status: targetStatus,
    status_changed_at: new Date().toISOString(),
  };

  if (action === "counter_propose") {
    if (!scheduled_at) {
      log.done(400);
      throw new ServiceError("Neues Datum erforderlich", 400);
    }
    updateData.previous_scheduled_at = slot.scheduled_at;
    updateData.scheduled_at = scheduled_at;
    updateData.counter_proposed_at = new Date().toISOString();
    updateData.proposed_by = userId;
  }

  if (action === "confirm") {
    // join_url wird NICHT mehr hier gesetzt — der Arzt startet die Sprechstunde
    // im nachbar-arzt Portal, welches die join_url via sprechstunde.online API setzt.
    // provider_type wird NICHT geändert — gehört zur Identität des Slots
  }

  if (action === "cancel") {
    updateData.cancelled_by = userId;
  }

  const { error: updateError } = await supabase
    .from("consultation_slots")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    log.error("update_error", updateError.message);
    log.done(500);
    throw new ServiceError("Aktualisierung fehlgeschlagen", 500);
  }

  log.info("appointment_action", { slotId: id, action, targetStatus });

  // Benachrichtigung an Arzt senden (async, nicht blockierend)
  const doctorId = slot.host_user_id ?? slot.doctor_id;
  if (doctorId) {
    const { data: patient } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", userId)
      .single();
    const patientName = patient?.display_name ?? "Patient";
    const scheduledAt =
      (updateData.scheduled_at as string) ?? slot.scheduled_at;
    const event =
      targetStatus === "confirmed"
        ? "confirmed"
        : targetStatus === "counter_proposed"
          ? "counter_proposed"
          : targetStatus === "declined"
            ? "declined"
            : "cancelled";

    // Push + E-Mail (fire-and-forget, Fehler nicht blockierend)
    sendAppointmentPush(doctorId, event, patientName, scheduledAt).catch(
      () => {},
    );

    const { data: doctor } = await supabase
      .from("users")
      .select("email")
      .eq("id", doctorId)
      .single();
    if (doctor?.email) {
      sendAppointmentEmail(doctor.email, event, patientName, scheduledAt).catch(
        () => {},
      );
    }
  }

  log.done(200);
  return { success: true, status: targetStatus };
}

/**
 * Termin buchen (POST /api/care/consultations/[id]/book)
 */
export async function bookConsultation(
  supabase: SupabaseClient,
  id: string,
  userId: string,
) {
  const log = createCareLogger("care/consultations/book/POST");

  // Slot laden
  const { data: slot, error: fetchError } = await supabase
    .from("consultation_slots")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !slot) {
    log.done(404);
    throw new ServiceError("Termin nicht gefunden", 404);
  }

  // Prüfen ob bereits gebucht
  if (slot.booked_by) {
    log.done(409);
    throw new ServiceError("Termin ist bereits gebucht", 409);
  }

  if (slot.status !== "scheduled") {
    log.done(409);
    throw new ServiceError("Termin ist nicht mehr verfügbar", 409);
  }

  // Video-Raum erstellen falls noch nicht vorhanden
  let joinUrl = slot.join_url;
  let roomId = slot.room_id;
  if (!joinUrl) {
    const provider = getProvider(slot.provider_type);
    const room = await provider.createRoom(slot.id);
    joinUrl = room.joinUrl;
    roomId = room.roomId;
  }

  // Optimistisches Update mit WHERE booked_by IS NULL (Race-Condition-Schutz)
  const { data: updated, error: updateError } = await supabase
    .from("consultation_slots")
    .update({
      booked_by: userId,
      booked_at: new Date().toISOString(),
      room_id: roomId,
      join_url: joinUrl,
    })
    .eq("id", id)
    .is("booked_by", null)
    .select()
    .single();

  if (updateError || !updated) {
    log.error("booking_failed", updateError?.message ?? "already_booked", {
      slotId: id,
    });
    log.done(409);
    throw new ServiceError(
      "Buchung fehlgeschlagen — evtl. bereits gebucht",
      409,
    );
  }

  log.info("slot_booked", { slotId: id, userId });
  log.done(200);
  return updated;
}

/**
 * Status-Übergänge für Sprechstunden-Slots (PATCH /api/care/consultations/[id]/status)
 */
export async function updateConsultationStatus(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  body: { status?: ConsultationStatus; notes?: string },
) {
  const log = createCareLogger("care/consultations/status/PATCH");

  if (!body.status) {
    throw new ServiceError("status ist erforderlich", 400);
  }

  // Slot laden
  const { data: slot } = await supabase
    .from("consultation_slots")
    .select("*")
    .eq("id", id)
    .single();

  if (!slot) {
    throw new ServiceError("Termin nicht gefunden", 404);
  }

  // Nur der Host darf den Status ändern
  if (slot.host_user_id !== userId) {
    throw new ServiceError("Nur der Host darf den Status ändern", 403);
  }

  // State-Machine prüfen
  const allowed = VALID_TRANSITIONS[slot.status] || [];
  if (!allowed.includes(body.status)) {
    throw new ServiceError(
      `Ungültige Status-Änderung: ${slot.status} → ${body.status}`,
      400,
    );
  }

  const updateData: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };

  // Notizen bei medizinischen Sprechstunden verschlüsseln (Art. 9 DSGVO)
  if (body.notes) {
    if (slot.provider_type === "medical") {
      updateData.notes = encryptField(body.notes);
    } else {
      updateData.notes = body.notes;
    }
  }

  const { data: updated, error } = await supabase
    .from("consultation_slots")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    log.error("status_update_failed", error.message);
    log.done(500);
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  // Audit-Log für medizinische Sprechstunden (strukturiertes JSON-Logging)
  // consultation_status_change ist kein CareAuditEventType, daher console.log
  if (slot.provider_type === "medical") {
    console.log(
      JSON.stringify({
        audit: "consultation_status_change",
        slotId: id,
        userId,
        from: slot.status,
        to: body.status,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  log.info("status_changed", {
    slotId: id,
    from: slot.status,
    to: body.status,
  });
  log.done(200);
  return updated;
}

/**
 * DSGVO-Einwilligung prüfen (GET /api/care/consultations/consent)
 */
export async function getConsultationConsent(
  supabase: SupabaseClient,
  userId: string,
  providerType: string,
) {
  const { data } = await supabase
    .from("consultation_consents")
    .select("id, consent_version, consented_at")
    .eq("user_id", userId)
    .eq("provider_type", providerType)
    .eq("consent_version", "v1")
    .maybeSingle();

  return { consented: !!data, consent: data };
}

/**
 * DSGVO-Einwilligung erteilen (POST /api/care/consultations/consent)
 */
export async function grantConsultationConsent(
  supabase: SupabaseClient,
  userId: string,
  providerType: string,
) {
  if (!["community", "medical"].includes(providerType)) {
    throw new ServiceError("Ungültiger provider_type", 400);
  }

  const { data, error } = await supabase
    .from("consultation_consents")
    .upsert(
      {
        user_id: userId,
        consent_version: "v1",
        provider_type: providerType,
        consented_at: new Date().toISOString(),
      },
      { onConflict: "user_id,consent_version,provider_type" },
    )
    .select()
    .single();

  if (error) throw new ServiceError("Vorgang fehlgeschlagen", 500);
  return data;
}
