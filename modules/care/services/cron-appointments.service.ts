// modules/care/services/cron-appointments.service.ts
// Nachbar.io — Termin-Erinnerungs-Cron: Faellige Terminerinnerungen versenden (alle 5 Min)

import { SupabaseClient } from "@supabase/supabase-js";
import { sendCareNotification } from "@/lib/care/notifications";
import {
  decryptFieldsArray,
  CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
} from "@/lib/care/field-encryption";
import { writeCronHeartbeat } from "@/lib/care/cron-heartbeat";
import { ServiceError } from "@/lib/services/service-error";
import type { CareAppointment } from "@/lib/care/types";

// Toleranz in Minuten (+/-) fuer den 5-Minuten-Cron-Intervall
const TOLERANCE_MINUTES = 2.5;

export interface CronAppointmentReminderResult {
  ok: true;
  sent: number;
  timestamp: string;
}

// Alle faelligen Terminerinnerungen pruefen und versenden
export async function runAppointmentReminderCron(
  supabase: SupabaseClient,
): Promise<CronAppointmentReminderResult> {
  const now = new Date();

  // Zeitfenster: alle Termine in den naechsten 24 Stunden laden
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: appointments, error: appointmentsError } = await supabase
    .from("care_appointments")
    .select(
      "id, senior_id, title, type, scheduled_at, duration_minutes, location, reminder_minutes_before, recurrence, managed_by, notes, created_at, updated_at",
    )
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  if (appointmentsError) {
    console.error(
      "[care/cron/appointments] Termin-Abfrage fehlgeschlagen:",
      appointmentsError,
    );
    throw new ServiceError("Termine konnten nicht geladen werden", 500);
  }

  // Termin-Felder entschluesseln (Art. 9 DSGVO) — Location und Notes fuer Benachrichtigungen
  const allAppointments: CareAppointment[] = decryptFieldsArray(
    appointments ?? [],
    CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
  ) as CareAppointment[];
  let sentCount = 0;

  for (const appointment of allAppointments) {
    const scheduledAt = new Date(appointment.scheduled_at);
    const reminderTimes = appointment.reminder_minutes_before ?? [];

    for (const reminderMinutes of reminderTimes) {
      // Zeitpunkt, zu dem die Erinnerung ausgeloest werden soll
      const reminderAt = new Date(
        scheduledAt.getTime() - reminderMinutes * 60 * 1000,
      );

      // Pruefen ob dieser Erinnerungszeitpunkt innerhalb der Toleranz liegt
      const diffMinutes = (now.getTime() - reminderAt.getTime()) / (1000 * 60);

      if (diffMinutes < -TOLERANCE_MINUTES || diffMinutes > TOLERANCE_MINUTES) {
        // Dieser Erinnerungszeitpunkt liegt nicht im aktuellen 5-Min-Fenster
        continue;
      }

      // Benachrichtigungstext erstellen
      const locationText = appointment.location
        ? ` — Ort: ${appointment.location}`
        : "";
      const timeStr = scheduledAt.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = scheduledAt.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      });

      let reminderLabel: string;
      if (reminderMinutes >= 60) {
        const hours = Math.round(reminderMinutes / 60);
        reminderLabel = `in ${hours} Stunde${hours !== 1 ? "n" : ""}`;
      } else {
        reminderLabel = `in ${reminderMinutes} Minuten`;
      }

      // Senior benachrichtigen
      try {
        await sendCareNotification(supabase, {
          userId: appointment.senior_id,
          type: "care_appointment_reminder",
          title: `Termin-Erinnerung: ${appointment.title}`,
          body: `Ihr Termin "${appointment.title}" findet ${reminderLabel} statt (${dateStr} um ${timeStr} Uhr)${locationText}.`,
          referenceId: appointment.id,
          referenceType: "care_appointments",
          url: "/care/appointments",
          channels: ["push", "in_app"],
        });
        sentCount++;
      } catch (notifyError) {
        console.error(
          `[care/cron/appointments] Erinnerung fuer Senior ${appointment.senior_id} (Termin ${appointment.id}) fehlgeschlagen:`,
          notifyError,
        );
      }

      // Betreuer-Nutzer benachrichtigen, falls abweichend vom Senior
      if (
        appointment.managed_by &&
        appointment.managed_by !== appointment.senior_id
      ) {
        try {
          await sendCareNotification(supabase, {
            userId: appointment.managed_by,
            type: "care_appointment_reminder",
            title: `Termin-Erinnerung: ${appointment.title}`,
            body: `Der Termin "${appointment.title}" fuer Ihren Angehoerigen findet ${reminderLabel} statt (${dateStr} um ${timeStr} Uhr)${locationText}.`,
            referenceId: appointment.id,
            referenceType: "care_appointments",
            url: "/care/appointments",
            channels: ["push", "in_app"],
          });
          sentCount++;
        } catch (notifyError) {
          console.error(
            `[care/cron/appointments] Betreuer-Erinnerung fuer ${appointment.managed_by} (Termin ${appointment.id}) fehlgeschlagen:`,
            notifyError,
          );
        }
      }
    }
  }

  // Heartbeat schreiben (FMEA: Termin-Cron)
  await writeCronHeartbeat(supabase, "appointments", { sent: sentCount });

  return {
    ok: true,
    sent: sentCount,
    timestamp: now.toISOString(),
  };
}
