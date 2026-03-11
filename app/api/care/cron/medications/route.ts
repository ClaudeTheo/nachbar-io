// app/api/care/cron/medications/route.ts
// Nachbar.io — Medikamenten-Erinnerungs-Cron: Faellige Einnahmen erinnern und verpasste protokollieren (alle 5 Min)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCareNotification } from '@/lib/care/notifications';
import { writeAuditLog } from '@/lib/care/audit';
import { MEDICATION_DEFAULTS } from '@/lib/care/constants';
import type { CareMedication, MedicationSchedule } from '@/lib/care/types';

// Wochentagsnamen auf Deutsch (Index entspricht getDay()-Rueckgabe: 0 = Sonntag)
const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/**
 * Berechnet die heutigen Einnahmezeitpunkte fuer ein Medikament basierend auf dem Schedule-Typ.
 * Gibt eine Liste von HH:MM-Strings zurueck.
 */
function getTodayScheduledTimes(schedule: MedicationSchedule, now: Date): string[] {
  if (schedule.type === 'daily') {
    // Taeglich: alle konfigurierten Zeiten
    return schedule.times ?? [];
  }

  if (schedule.type === 'weekly') {
    // Woechentlich: nur wenn der heutige Wochentag enthalten ist
    const dayName = DAY_NAMES[now.getDay()];
    if (schedule.days?.includes(dayName)) {
      return schedule.time ? [schedule.time] : [];
    }
    return [];
  }

  // Interval-Typ wird vom Cron nicht unterstuetzt (zu komplex fuer 5-Min-Intervall)
  return [];
}

// GET /api/care/cron/medications — Medikamenten-Erinnerungs-Scheduler (Vercel Cron: alle 5 Minuten)
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen (falls konfiguriert)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
  }

  const supabase = await createClient();

  // Alle aktiven Medikamente laden
  const { data: medications, error: medicationsError } = await supabase
    .from('care_medications')
    .select('id, senior_id, name, dosage, schedule, instructions, managed_by, active, created_at, updated_at')
    .eq('active', true);

  if (medicationsError) {
    console.error('[care/cron/medications] Medikamenten-Abfrage fehlgeschlagen:', medicationsError);
    return NextResponse.json(
      { error: 'Medikamente konnten nicht geladen werden' },
      { status: 500 }
    );
  }

  const allMedications: CareMedication[] = medications ?? [];
  const now = new Date();

  let remindersCount = 0;
  let missedCount = 0;

  for (const medication of allMedications) {
    const schedule = medication.schedule as MedicationSchedule;
    const scheduledTimes = getTodayScheduledTimes(schedule, now);

    for (const timeStr of scheduledTimes) {
      // Geplanten Einnahmezeitpunkt fuer heute berechnen (HH:MM -> Date)
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;

      const scheduledAt = new Date(now);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const elapsedMinutes = (now.getTime() - scheduledAt.getTime()) / (1000 * 60);

      // Nur Zeitpunkte beruecksichtigen, die in der Vergangenheit liegen
      if (elapsedMinutes < 0) continue;

      // Vorhandenen Log-Eintrag fuer diese Medikament+Zeit-Kombination pruefen
      const { data: existingLog, error: logError } = await supabase
        .from('care_medication_logs')
        .select('id, status, snoozed_until, confirmed_at')
        .eq('medication_id', medication.id)
        .eq('senior_id', medication.senior_id)
        .eq('scheduled_at', scheduledAt.toISOString())
        .maybeSingle();

      if (logError) {
        console.error(
          `[care/cron/medications] Log-Abfrage fuer Medikament ${medication.id} fehlgeschlagen:`,
          logError
        );
        continue;
      }

      // === Snoozed-Re-Erinnerung: Snooze abgelaufen ===
      if (existingLog?.status === 'snoozed' && existingLog.snoozed_until) {
        const snoozedUntil = new Date(existingLog.snoozed_until);

        // Pruefe ob Snooze-Zeit abgelaufen und noch nicht mehr als 5 Min verstrichen
        const snoozeElapsedMinutes = (now.getTime() - snoozedUntil.getTime()) / (1000 * 60);
        if (snoozeElapsedMinutes >= 0 && snoozeElapsedMinutes < 5) {
          // Re-Erinnerung nach Snooze senden
          try {
            await sendCareNotification(supabase, {
              userId: medication.senior_id,
              type: 'care_medication_reminder',
              title: 'Medikamenten-Erinnerung (verschoben)',
              body: `Bitte nehmen Sie jetzt Ihr Medikament: ${medication.name}${medication.dosage ? ` (${medication.dosage})` : ''}.`,
              referenceId: existingLog.id,
              referenceType: 'care_medication_logs',
              url: '/care/medications',
              channels: ['push', 'in_app'],
            });
            remindersCount++;
          } catch (notifyError) {
            console.error(
              `[care/cron/medications] Re-Erinnerung nach Snooze fuer Senior ${medication.senior_id} fehlgeschlagen:`,
              notifyError
            );
          }
        }
        continue;
      }

      // Bereits genommen, uebersprungen oder verpasst — kein weiterer Handlungsbedarf
      if (existingLog?.status === 'taken' || existingLog?.status === 'skipped' || existingLog?.status === 'missed') {
        continue;
      }

      // === Phase 1: Erste Erinnerung (0-5 Min nach Faelligkeitszeit) ===
      if (elapsedMinutes >= 0 && elapsedMinutes < 5) {
        if (!existingLog) {
          // Noch kein Log-Eintrag — Erinnerung senden
          try {
            await sendCareNotification(supabase, {
              userId: medication.senior_id,
              type: 'care_medication_reminder',
              title: 'Zeit fuer Ihr Medikament',
              body: `Bitte nehmen Sie jetzt: ${medication.name}${medication.dosage ? ` (${medication.dosage})` : ''}${medication.instructions ? `. Hinweis: ${medication.instructions}` : ''}.`,
              referenceType: 'care_medications',
              referenceId: medication.id,
              url: '/care/medications',
              channels: ['push', 'in_app'],
            });
            remindersCount++;
          } catch (notifyError) {
            console.error(
              `[care/cron/medications] Erste Erinnerung fuer Senior ${medication.senior_id} fehlgeschlagen:`,
              notifyError
            );
          }
        }
        continue;
      }

      // === Phase 2: Verpasst-Markierung (nach MEDICATION_DEFAULTS.missedAfterMinutes) ===
      if (
        elapsedMinutes >= MEDICATION_DEFAULTS.missedAfterMinutes &&
        elapsedMinutes < MEDICATION_DEFAULTS.missedAfterMinutes + 5
      ) {
        if (!existingLog) {
          // Keinen Log-Eintrag gefunden — als verpasst protokollieren
          const { data: missedLog, error: insertError } = await supabase
            .from('care_medication_logs')
            .insert({
              medication_id: medication.id,
              senior_id: medication.senior_id,
              scheduled_at: scheduledAt.toISOString(),
              status: 'missed',
              confirmed_at: null,
              snoozed_until: null,
            })
            .select('id')
            .single();

          if (insertError || !missedLog) {
            console.error(
              `[care/cron/medications] Verpasst-Log fuer Medikament ${medication.id} konnte nicht erstellt werden:`,
              insertError
            );
            continue;
          }

          missedCount++;

          // Audit-Log: Medikament verpasst
          try {
            await writeAuditLog(supabase, {
              seniorId: medication.senior_id,
              actorId: 'system',
              eventType: 'medication_missed',
              referenceType: 'care_medication_logs',
              referenceId: missedLog.id,
              metadata: {
                medicationId: medication.id,
                medicationName: medication.name,
                scheduledAt: scheduledAt.toISOString(),
                scheduledTime: timeStr,
              },
            });
          } catch (auditError) {
            console.error(
              `[care/cron/medications] Audit-Log (medication_missed) fehlgeschlagen:`,
              auditError
            );
          }

          // Benachrichtigung an Senior
          try {
            await sendCareNotification(supabase, {
              userId: medication.senior_id,
              type: 'care_medication_missed',
              title: 'Medikament nicht eingenommen',
              body: `Sie haben ${medication.name} um ${timeStr} Uhr nicht eingenommen. Bitte wenden Sie sich an Ihre Angehoerigen oder Ihren Arzt.`,
              referenceId: missedLog.id,
              referenceType: 'care_medication_logs',
              url: '/care/medications',
              channels: ['push', 'in_app'],
            });
          } catch (notifyError) {
            console.error(
              `[care/cron/medications] Verpasst-Benachrichtigung fuer Senior ${medication.senior_id} fehlgeschlagen:`,
              notifyError
            );
          }

          // Angehoerige und Pflegedienst-Helfer benachrichtigen
          try {
            const { data: helpers, error: helpersError } = await supabase
              .from('care_helpers')
              .select('user_id, role')
              .in('role', ['relative', 'care_service'])
              .eq('verification_status', 'verified')
              .contains('assigned_seniors', [medication.senior_id]);

            if (helpersError) {
              console.error(
                `[care/cron/medications] Helfer-Abfrage fuer Senior ${medication.senior_id} fehlgeschlagen:`,
                helpersError
              );
            } else if (helpers && helpers.length > 0) {
              const notifyPromises = helpers.map((helper) =>
                sendCareNotification(supabase, {
                  userId: helper.user_id,
                  type: 'care_medication_missed',
                  title: 'Medikament nicht eingenommen — Bitte nachfragen',
                  body: `Ihr Angehoeriger hat ${medication.name} um ${timeStr} Uhr nicht eingenommen.`,
                  referenceId: missedLog.id,
                  referenceType: 'care_medication_logs',
                  url: '/care/medications',
                  channels: ['push', 'in_app'],
                })
              );

              await Promise.all(notifyPromises);
            }
          } catch (notifyError) {
            console.error(
              `[care/cron/medications] Helfer-Benachrichtigung fuer Senior ${medication.senior_id} fehlgeschlagen:`,
              notifyError
            );
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    reminders: remindersCount,
    missed: missedCount,
    timestamp: now.toISOString(),
  });
}
