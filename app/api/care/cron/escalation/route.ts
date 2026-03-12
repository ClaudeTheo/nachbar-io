// app/api/care/cron/escalation/route.ts
// Nachbar.io — Automatischer Eskalations-Cron: SOS-Alerts stufenweise eskalieren (jede Minute)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shouldEscalate, getNextEscalationLevel, getEscalationMeta } from '@/lib/care/escalation';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { createCareLogger } from '@/lib/care/logger';
import type { EscalationConfig } from '@/lib/care/types';

// GET /api/care/cron/escalation — Automatische SOS-Eskalation (Vercel Cron: jede Minute)
export async function GET(request: NextRequest) {
  const log = createCareLogger('care/cron/escalation');
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    log.error('cron_secret_missing');
    log.done(500);
    return NextResponse.json({ error: 'Server nicht konfiguriert' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const supabase = await createClient();

  // Alle offenen SOS-Alerts laden, die noch eskaliert werden koennen
  const { data: openAlerts, error: alertsError } = await supabase
    .from('care_sos_alerts')
    .select('id, senior_id, status, current_escalation_level, escalated_at, created_at, category')
    .in('status', ['triggered', 'notified', 'escalated'])
    .lt('current_escalation_level', 4);

  if (alertsError) {
    log.error('alerts_query_failed', alertsError);
    log.done(500);
    return NextResponse.json(
      { error: 'Alerts konnten nicht geladen werden' },
      { status: 500 }
    );
  }

  const alerts = openAlerts ?? [];
  let checkedCount = 0;
  let escalatedCount = 0;
  let failedCount = 0;

  for (const alert of alerts) {
    checkedCount++;

    // Eskalationskonfiguration des Seniors laden
    const { data: careProfile, error: profileError } = await supabase
      .from('care_profiles')
      .select('escalation_config')
      .eq('user_id', alert.senior_id)
      .maybeSingle();

    if (profileError) {
      log.warn('profile_query_failed', { alertId: alert.id, seniorId: alert.senior_id });
    }

    const escalationConfig: EscalationConfig | undefined =
      careProfile?.escalation_config ?? undefined;

    // Pruefen ob Eskalation faellig ist
    const currentLevel: number = alert.current_escalation_level ?? 1;
    const escalatedAt: string[] = Array.isArray(alert.escalated_at) ? alert.escalated_at : [];

    const shouldEscalateNow = shouldEscalate(
      currentLevel,
      alert.created_at,
      escalatedAt,
      escalationConfig
    );

    if (!shouldEscalateNow) {
      continue;
    }

    // Naechste Eskalationsstufe ermitteln
    const toLevel = getNextEscalationLevel(currentLevel);
    if (toLevel === null) {
      // Sollte durch lt('current_escalation_level', 4) nicht vorkommen
      continue;
    }

    const fromLevel = currentLevel;

    // Neuen Eskalations-Zeitstempel anhaengen
    const updatedEscalatedAt = [...escalatedAt, new Date().toISOString()];

    // Alert aktualisieren mit Retry-Logik (bis zu 3 Versuche bei transientem DB-Fehler)
    let updateSucceeded = false;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { error } = await supabase
        .from('care_sos_alerts')
        .update({
          current_escalation_level: toLevel,
          escalated_at: updatedEscalatedAt,
          status: 'escalated',
        })
        .eq('id', alert.id);

      if (!error) {
        updateSucceeded = true;
        break;
      }

      if (attempt < maxRetries - 1) {
        log.warn('db_update_retry', { alertId: alert.id, attempt: attempt + 1, maxRetries });
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        log.error('db_update_failed_permanently', error, { alertId: alert.id, maxRetries });
      }
    }

    if (!updateSucceeded) {
      failedCount++;
      // Admin-Benachrichtigung bei fehlgeschlagener Eskalation (sicherheitskritisch!)
      try {
        await sendCareNotification(supabase, {
          userId: alert.senior_id,
          type: 'care_escalation',
          title: '[SYSTEM-FEHLER] SOS-Eskalation fehlgeschlagen',
          body: `SOS-Alert ${alert.id} konnte nicht von Stufe ${fromLevel} auf ${toLevel} eskaliert werden. Manuelle Intervention erforderlich.`,
          referenceId: alert.id,
          referenceType: 'care_sos_alerts',
          url: `/care/sos/${alert.id}`,
          channels: ['admin_alert'],
        });
      } catch (adminNotifyError) {
        log.error('admin_alert_failed', adminNotifyError, { alertId: alert.id });
      }
      continue;
    }

    escalatedCount++;
    log.info('alert_escalated', { alertId: alert.id, fromLevel, toLevel, seniorId: alert.senior_id });

    // Metadaten der neuen Eskalationsstufe abrufen (Label, Rolle, Kanaele)
    const escalationMeta = getEscalationMeta(toLevel);

    if (escalationMeta) {
      try {
        // Stufe 4: Kein konkreter Helfer — Admin-Alert an alle Admins senden
        if (escalationMeta.role === null) {
          await sendCareNotification(supabase, {
            userId: alert.senior_id,
            type: 'care_escalation',
            title: `[ESKALATION Stufe 4] SOS-Alert`,
            body: `SOS-Alert ${alert.id} hat maximale Eskalationsstufe erreicht. Sofortige Intervention erforderlich.`,
            referenceId: alert.id,
            referenceType: 'care_sos_alerts',
            url: `/care/sos/${alert.id}`,
            channels: ['admin_alert'],
          });
        } else {
          // Stufe 1-3: Alle verifizierten Helfer der entsprechenden Rolle benachrichtigen
          // mit Fallback-Kaskade (Push -> SMS -> Voice)
          const { data: helpers, error: helpersError } = await supabase
            .from('care_helpers')
            .select('user_id')
            .eq('role', escalationMeta.role)
            .eq('verification_status', 'verified')
            .contains('assigned_seniors', [alert.senior_id]);

          if (helpersError) {
            log.error('helpers_query_failed', helpersError, { alertId: alert.id, level: toLevel });
          } else if (helpers && helpers.length > 0) {
            // Kanaele aus den Metadaten als mutable Array uebernehmen
            const notificationChannels = [...escalationMeta.channels] as (
              | 'push'
              | 'in_app'
              | 'sms'
              | 'voice'
              | 'admin_alert'
            )[];

            // Telefonnummern der Helfer laden fuer SMS/Voice-Fallback
            const { data: helperPhones } = await supabase
              .from('users')
              .select('id, phone')
              .in('id', helpers.map(h => h.user_id));
            const phoneMap = new Map((helperPhones ?? []).map(u => [u.id, u.phone as string | null]));

            const notifyPromises = helpers.map((helper) =>
              sendCareNotification(supabase, {
                userId: helper.user_id,
                type: 'care_escalation',
                title: `SOS-Eskalation Stufe ${toLevel}: ${escalationMeta.label}`,
                body: `Ein SOS-Alert wurde automatisch auf Stufe ${toLevel} eskaliert. Bitte reagieren Sie sofort.`,
                referenceId: alert.id,
                referenceType: 'care_sos_alerts',
                url: `/care/sos/${alert.id}`,
                channels: notificationChannels,
                phone: phoneMap.get(helper.user_id) ?? undefined,
                enableFallback: true,
              })
            );

            await Promise.all(notifyPromises);
          }
        }
      } catch (notifyError) {
        // Benachrichtigungsfehler blockiert nicht den Eskalationsprozess
        log.error('notification_failed', notifyError, { alertId: alert.id, level: toLevel });
      }
    }

    // Audit-Log schreiben: automatische Eskalation dokumentieren
    try {
      await writeAuditLog(supabase, {
        seniorId: alert.senior_id,
        actorId: 'system',
        eventType: 'sos_escalated',
        referenceType: 'care_sos_alerts',
        referenceId: alert.id,
        metadata: { fromLevel, toLevel, automatic: true },
      });
    } catch (auditError) {
      log.warn('audit_log_failed', { alertId: alert.id });
    }
  }

  // Heartbeat schreiben (FMEA FM-SOS-03)
  await writeCronHeartbeat(supabase, 'escalation', { checked: checkedCount, escalated: escalatedCount, failed: failedCount });

  log.done(200, { checked: checkedCount, escalated: escalatedCount, failed: failedCount });

  return NextResponse.json({
    checked: checkedCount,
    escalated: escalatedCount,
    failed: failedCount,
    timestamp: new Date().toISOString(),
  });
}
