// app/api/care/cron/checkin/route.ts
// Nachbar.io — Check-in Scheduler Cron: Faellige Check-ins erstellen, erinnern und eskalieren (alle 5 Min)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { CHECKIN_DEFAULTS } from '@/lib/care/constants';
import { encryptField } from '@/lib/care/field-encryption';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { getUserQuarterId } from '@/lib/quarters/helpers';

// GET /api/care/cron/checkin — Check-in Scheduler (Vercel Cron: alle 5 Minuten)
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET nicht konfiguriert — Cron-Endpunkt blockiert');
    return NextResponse.json({ error: 'Server nicht konfiguriert' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const supabase = await createClient();

  // Alle Care-Profile laden, fuer die Check-ins aktiviert sind
  const { data: profiles, error: profilesError } = await supabase
    .from('care_profiles')
    .select('user_id, checkin_times')
    .eq('checkin_enabled', true);

  if (profilesError) {
    console.error('[care/cron/checkin] Profile-Abfrage fehlgeschlagen:', profilesError);
    return NextResponse.json(
      { error: 'Profile konnten nicht geladen werden' },
      { status: 500 }
    );
  }

  const allProfiles = profiles ?? [];
  const now = new Date();

  let createdCount = 0;
  let remindedCount = 0;
  let escalatedCount = 0;

  for (const profile of allProfiles) {
    const checkinTimes: string[] = Array.isArray(profile.checkin_times)
      ? profile.checkin_times
      : [...CHECKIN_DEFAULTS.defaultTimes];

    for (const timeStr of checkinTimes) {
      // Geplanten Check-in-Zeitpunkt fuer heute berechnen (HH:MM -> Date)
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;

      const scheduledAt = new Date(now);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const elapsedMinutes = (now.getTime() - scheduledAt.getTime()) / (1000 * 60);

      // === Phase 1: Check-in erstellen (0-5 Min nach Faelligkeitszeit) ===
      if (elapsedMinutes >= 0 && elapsedMinutes < 5) {
        // Pruefen ob fuer diesen Zeitpunkt bereits ein Check-in existiert
        const { data: existing, error: existingError } = await supabase
          .from('care_checkins')
          .select('id')
          .eq('senior_id', profile.user_id)
          .eq('scheduled_at', scheduledAt.toISOString())
          .maybeSingle();

        if (existingError) {
          console.error(
            `[care/cron/checkin] Existenz-Pruefung fuer Senior ${profile.user_id} fehlgeschlagen:`,
            existingError
          );
          continue;
        }

        if (!existing) {
          // Neuen ausstehenden Check-in anlegen
          const { data: newCheckin, error: insertError } = await supabase
            .from('care_checkins')
            .insert({
              senior_id: profile.user_id,
              status: 'reminded',
              mood: null,
              note: null,
              scheduled_at: scheduledAt.toISOString(),
              completed_at: null,
              reminder_sent_at: null,
              escalated: false,
            })
            .select('id')
            .single();

          if (insertError || !newCheckin) {
            console.error(
              `[care/cron/checkin] Check-in fuer Senior ${profile.user_id} konnte nicht erstellt werden:`,
              insertError
            );
            continue;
          }

          createdCount++;

          // Erste Push-Erinnerung an den Senior senden
          try {
            await sendCareNotification(supabase, {
              userId: profile.user_id,
              type: 'care_checkin_reminder',
              title: 'Zeit fuer Ihren Check-in',
              body: `Bitte melden Sie sich: Wie geht es Ihnen? (Geplant: ${timeStr} Uhr)`,
              referenceId: newCheckin.id,
              referenceType: 'care_checkins',
              url: '/care/checkin',
              channels: ['push', 'in_app'],
            });
          } catch (notifyError) {
            console.error(
              `[care/cron/checkin] Erste Erinnerung fuer Senior ${profile.user_id} fehlgeschlagen:`,
              notifyError
            );
          }
        }

        continue;
      }

      // === Phase 2: Erinnerung senden (30-35 Min nach Faelligkeitszeit) ===
      if (
        elapsedMinutes >= CHECKIN_DEFAULTS.reminderAfterMinutes &&
        elapsedMinutes < CHECKIN_DEFAULTS.reminderAfterMinutes + 5
      ) {
        // Offenen Check-in suchen (noch nicht abgeschlossen, noch keine zweite Erinnerung)
        const { data: pendingCheckin, error: pendingError } = await supabase
          .from('care_checkins')
          .select('id, reminder_sent_at, completed_at')
          .eq('senior_id', profile.user_id)
          .eq('scheduled_at', scheduledAt.toISOString())
          .is('completed_at', null)
          .is('reminder_sent_at', null)
          .maybeSingle();

        if (pendingError) {
          console.error(
            `[care/cron/checkin] Erinnerungs-Abfrage fuer Senior ${profile.user_id} fehlgeschlagen:`,
            pendingError
          );
          continue;
        }

        if (pendingCheckin) {
          // reminder_sent_at setzen um doppelte Erinnerungen zu verhindern
          const { error: updateError } = await supabase
            .from('care_checkins')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', pendingCheckin.id);

          if (updateError) {
            console.error(
              `[care/cron/checkin] reminder_sent_at Update fuer Check-in ${pendingCheckin.id} fehlgeschlagen:`,
              updateError
            );
            continue;
          }

          remindedCount++;

          // Zweite Push-Erinnerung an den Senior senden
          try {
            await sendCareNotification(supabase, {
              userId: profile.user_id,
              type: 'care_checkin_reminder',
              title: 'Erinnerung: Bitte melden Sie sich',
              body: `Sie haben sich noch nicht eingecheckt. Ihr letzter geplanter Check-in war um ${timeStr} Uhr.`,
              referenceId: pendingCheckin.id,
              referenceType: 'care_checkins',
              url: '/care/checkin',
              channels: ['push', 'in_app'],
            });
          } catch (notifyError) {
            console.error(
              `[care/cron/checkin] Zweite Erinnerung fuer Senior ${profile.user_id} fehlgeschlagen:`,
              notifyError
            );
          }
        }

        continue;
      }

      // === Phase 3: Eskalation (60-65 Min nach Faelligkeitszeit) ===
      if (
        elapsedMinutes >= CHECKIN_DEFAULTS.escalateAfterMinutes &&
        elapsedMinutes < CHECKIN_DEFAULTS.escalateAfterMinutes + 5
      ) {
        // Offenen, nicht-eskalierten Check-in suchen
        const { data: overdueCheckin, error: overdueError } = await supabase
          .from('care_checkins')
          .select('id, completed_at, escalated')
          .eq('senior_id', profile.user_id)
          .eq('scheduled_at', scheduledAt.toISOString())
          .is('completed_at', null)
          .eq('escalated', false)
          .maybeSingle();

        if (overdueError) {
          console.error(
            `[care/cron/checkin] Eskalations-Abfrage fuer Senior ${profile.user_id} fehlgeschlagen:`,
            overdueError
          );
          continue;
        }

        if (overdueCheckin) {
          // Check-in als verpasst und eskaliert markieren
          const { error: updateError } = await supabase
            .from('care_checkins')
            .update({ status: 'missed', escalated: true })
            .eq('id', overdueCheckin.id);

          if (updateError) {
            console.error(
              `[care/cron/checkin] Eskalations-Update fuer Check-in ${overdueCheckin.id} fehlgeschlagen:`,
              updateError
            );
            continue;
          }

          escalatedCount++;

          // Audit-Log: Check-in verpasst
          try {
            await writeAuditLog(supabase, {
              seniorId: profile.user_id,
              actorId: 'system',
              eventType: 'checkin_missed',
              referenceType: 'care_checkins',
              referenceId: overdueCheckin.id,
              metadata: { scheduledAt: scheduledAt.toISOString(), scheduledTime: timeStr },
            });
          } catch (auditError) {
            console.error(
              `[care/cron/checkin] Audit-Log (checkin_missed) fehlgeschlagen:`,
              auditError
            );
          }

          // Auto-SOS-Alert anlegen: Quelle 'checkin_timeout'
          let sosAlertId: string | null = null;
          try {
            const quarterId = await getUserQuarterId(supabase, profile.user_id);
            const { data: sosAlert, error: sosError } = await supabase
              .from('care_sos_alerts')
              .insert({
                senior_id: profile.user_id,
                category: 'general_help',
                status: 'triggered',
                current_escalation_level: 1,
                escalated_at: [],
                notes: encryptField(`Automatischer SOS-Alert: Check-in um ${timeStr} Uhr wurde nicht bestaetigt.`),
                source: 'checkin_timeout',
                quarter_id: quarterId,
              })
              .select('id')
              .single();

            if (sosError || !sosAlert) {
              console.error(
                `[care/cron/checkin] Auto-SOS fuer Senior ${profile.user_id} konnte nicht erstellt werden:`,
                sosError
              );
            } else {
              sosAlertId = sosAlert.id;
            }
          } catch (sosCreateError) {
            console.error(
              `[care/cron/checkin] Auto-SOS Erstellung fehlgeschlagen:`,
              sosCreateError
            );
          }

          // Audit-Log: Check-in eskaliert (SOS ausgeloest)
          try {
            await writeAuditLog(supabase, {
              seniorId: profile.user_id,
              actorId: 'system',
              eventType: 'checkin_escalated',
              referenceType: 'care_checkins',
              referenceId: overdueCheckin.id,
              metadata: {
                scheduledAt: scheduledAt.toISOString(),
                scheduledTime: timeStr,
                sosAlertId,
                automatic: true,
              },
            });
          } catch (auditError) {
            console.error(
              `[care/cron/checkin] Audit-Log (checkin_escalated) fehlgeschlagen:`,
              auditError
            );
          }

          // Angehoerige und Pflegedienst-Helfer benachrichtigen
          try {
            const { data: helpers, error: helpersError } = await supabase
              .from('care_helpers')
              .select('user_id, role')
              .in('role', ['relative', 'care_service'])
              .eq('verification_status', 'verified')
              .contains('assigned_seniors', [profile.user_id]);

            if (helpersError) {
              console.error(
                `[care/cron/checkin] Helfer-Abfrage fuer Senior ${profile.user_id} fehlgeschlagen:`,
                helpersError
              );
            } else if (helpers && helpers.length > 0) {
              const notifyPromises = helpers.map((helper) =>
                sendCareNotification(supabase, {
                  userId: helper.user_id,
                  type: 'care_checkin_missed',
                  title: 'Check-in verpasst',
                  body: 'Ihr Angehoeriger hat den Check-in seit ueber 60 Minuten nicht bestaetigt.',
                  referenceId: sosAlertId ?? overdueCheckin.id,
                  referenceType: sosAlertId ? 'care_sos_alerts' : 'care_checkins',
                  url: sosAlertId ? `/care/sos/${sosAlertId}` : '/care/checkin',
                  channels: ['push', 'sms', 'in_app'],
                  enableFallback: true,
                })
              );

              await Promise.all(notifyPromises);
            }
          } catch (notifyError) {
            console.error(
              `[care/cron/checkin] Helfer-Benachrichtigung fuer Senior ${profile.user_id} fehlgeschlagen:`,
              notifyError
            );
          }
        }
      }
    }
  }

  // Heartbeat schreiben (FMEA FM-CI-01)
  await writeCronHeartbeat(supabase, 'checkin', { created: createdCount, reminded: remindedCount, escalated: escalatedCount });

  return NextResponse.json({
    created: createdCount,
    reminded: remindedCount,
    escalated: escalatedCount,
    timestamp: now.toISOString(),
  });
}
