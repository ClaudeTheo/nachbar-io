// lib/appointments.ts
// Validierung + Business-Logik fuer Termin-Buchungen (Pro Medical)

import type { SupabaseClient } from '@supabase/supabase-js';

// --- Typen ---

export const APPOINTMENT_TYPES = ['video', 'phone', 'in_person'] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = ['booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// Gueltige Status-Uebergaenge: von → erlaubte Zielstatus
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'no_show'],
  completed: ['no_show'],
  cancelled: ['no_show'],
  no_show: [],
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface AppointmentCreateInput {
  doctor_id?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  type?: string;
  notes?: string;
}

export interface AppointmentUpdateInput {
  status?: string;
  notes?: string;
  meeting_url?: string;
}

// --- UUID-Validierung ---

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// --- Validierungsfunktionen ---

/**
 * Validiert die Eingaben fuer eine neue Terminbuchung.
 */
export function validateAppointmentCreate(body: AppointmentCreateInput): ValidationResult {
  // doctor_id ist Pflichtfeld und muss eine gueltige UUID sein
  if (!body.doctor_id) {
    return { valid: false, error: 'Arzt-ID ist erforderlich' };
  }
  if (!isValidUUID(body.doctor_id)) {
    return { valid: false, error: 'Arzt-ID muss eine gueltige UUID sein' };
  }

  // scheduled_at ist Pflichtfeld und muss in der Zukunft liegen
  if (!body.scheduled_at) {
    return { valid: false, error: 'Terminzeitpunkt ist erforderlich' };
  }
  const scheduledDate = new Date(body.scheduled_at);
  if (isNaN(scheduledDate.getTime())) {
    return { valid: false, error: 'Terminzeitpunkt ist kein gueltiges Datum' };
  }
  if (scheduledDate <= new Date()) {
    return { valid: false, error: 'Terminzeitpunkt muss in der Zukunft liegen' };
  }

  // duration_minutes: 5-60 Minuten
  if (body.duration_minutes !== undefined) {
    if (!Number.isInteger(body.duration_minutes) || body.duration_minutes < 5 || body.duration_minutes > 60) {
      return { valid: false, error: 'Dauer muss zwischen 5 und 60 Minuten liegen' };
    }
  }

  // type muss ein gueltiger Termintyp sein
  if (body.type !== undefined) {
    if (!APPOINTMENT_TYPES.includes(body.type as AppointmentType)) {
      return { valid: false, error: `Termintyp muss einer von ${APPOINTMENT_TYPES.join(', ')} sein` };
    }
  }

  return { valid: true };
}

/**
 * Validiert Status-Uebergaenge bei Termin-Updates.
 */
export function validateAppointmentUpdate(
  body: AppointmentUpdateInput,
  currentStatus?: AppointmentStatus
): ValidationResult {
  if (!body.status && !body.notes && !body.meeting_url) {
    return { valid: false, error: 'Keine aenderbaren Felder angegeben' };
  }

  if (body.status) {
    // Status muss ein gueltiger Wert sein
    if (!APPOINTMENT_STATUSES.includes(body.status as AppointmentStatus)) {
      return { valid: false, error: `Ungueltiger Status: ${body.status}` };
    }

    // Status-Uebergang pruefen
    if (currentStatus) {
      const allowed = VALID_TRANSITIONS[currentStatus];
      if (!allowed.includes(body.status as AppointmentStatus)) {
        return {
          valid: false,
          error: `Statuswechsel von '${currentStatus}' zu '${body.status}' ist nicht erlaubt`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Prueft ob ein Zeitslot fuer den Arzt verfuegbar ist (keine Ueberlappung).
 * Gibt true zurueck wenn der Slot frei ist.
 */
export async function checkSlotAvailability(
  supabase: SupabaseClient,
  doctorId: string,
  scheduledAt: string,
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<{ available: boolean; error?: string }> {
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  // Alle aktiven Termine des Arztes laden, die sich ueberlappen koennten
  // Ueberlappung: bestehender Start < neues Ende UND bestehender Ende > neuer Start
  let query = supabase
    .from('appointments')
    .select('id, scheduled_at, duration_minutes')
    .eq('doctor_id', doctorId)
    .in('status', ['booked', 'confirmed', 'in_progress']);

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[appointments] Slot-Pruefung fehlgeschlagen:', error);
    return { available: false, error: 'Slot-Verfuegbarkeit konnte nicht geprueft werden' };
  }

  // Manuell auf Ueberlappung pruefen
  for (const existing of data ?? []) {
    const existingStart = new Date(existing.scheduled_at);
    const existingEnd = new Date(existingStart.getTime() + (existing.duration_minutes ?? 30) * 60 * 1000);

    if (startTime < existingEnd && endTime > existingStart) {
      return { available: false, error: 'Dieser Zeitslot ist bereits belegt' };
    }
  }

  return { available: true };
}
