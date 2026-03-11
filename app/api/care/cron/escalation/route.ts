// app/api/care/cron/escalation/route.ts
// Nachbar.io — Automatischer Eskalations-Cron: SOS-Alerts stufenweise eskalieren (jede Minute)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shouldEscalate, getNextEscalationLevel, getEscalationMeta } from '@/lib/care/escalation';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import type { EscalationConfig } from '@/lib/care/types';

// GET /api/care/cron/escalation — Automatische SOS-Eskalation (Vercel Cron: jede Minute)
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

  // Alle offenen SOS-Alerts laden, die noch eskaliert werden koennen
  const { data: openAlerts, error: alertsError } = await supabase
    .from('care_sos_alerts')
    .select('id, senior_id, status, current_escalation_level, escalated_at, created_at, category')
    .in('status', ['triggered', 'notified', 'escalated'])
    .lt('current_escalation_level', 4);

  if (alertsError) {
    console.error('[care/cron/escalation] Alerts-Abfrage fehlgeschlagen:', alertsError);
    return NextResponse.json(
      { error: 'Alerts konnten nicht geladen werden' },
      { status: 500 }
    );
  }

  const alerts = openAlerts ?? [];
  let checkedCount = 0;
  let escalatedCount = 0;

  for (const alert of alerts) {
    checkedCount++;

    // Eskalationskonfiguration des Seniors laden
    const { data: careProfile, error: profileError } = await supabase
      .from('care_profiles')
      .select('escalation_config')
      .eq('user_id', alert.senior_id)
      .maybeSingle();

    if (profileError) {
      console.error(
        `[care/cron/escalation] Profil fuer Senior ${alert.senior_id} konnte nicht geladen werden:`,
        profileError
      );
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

    // Alert aktualisieren: neue Stufe, erweitertes Zeitstempel-Array, Status auf 'escalated'
    const { error: updateError } = await supabase
      .from('care_sos_alerts')
      .update({
        current_escalation_level: toLevel,
        escalated_at: updatedEscalatedAt,
        status: 'escalated',
      })
      .eq('id', alert.id);

    if (updateError) {
      console.error(
        `[care/cron/escalation] Update fuer Alert ${alert.id} fehlgeschlagen:`,
        updateError
      );
      continue;
    }

    escalatedCount++;

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
          const { data: helpers, error: helpersError } = await supabase
            .from('care_helpers')
            .select('user_id')
            .eq('role', escalationMeta.role)
            .eq('verification_status', 'verified')
            .contains('assigned_seniors', [alert.senior_id]);

          if (helpersError) {
            console.error(
              `[care/cron/escalation] Helfer-Abfrage fuer Alert ${alert.id} fehlgeschlagen:`,
              helpersError
            );
          } else if (helpers && helpers.length > 0) {
            // Kanaele aus den Metadaten als mutable Array uebernehmen
            const notificationChannels = [...escalationMeta.channels] as (
              | 'push'
              | 'in_app'
              | 'sms'
              | 'voice'
              | 'admin_alert'
            )[];

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
              })
            );

            await Promise.all(notifyPromises);
          }
        }
      } catch (notifyError) {
        // Benachrichtigungsfehler blockiert nicht den Eskalationsprozess
        console.error(
          `[care/cron/escalation] Benachrichtigung fuer Alert ${alert.id} fehlgeschlagen:`,
          notifyError
        );
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
      console.error(
        `[care/cron/escalation] Audit-Log fuer Alert ${alert.id} konnte nicht geschrieben werden:`,
        auditError
      );
    }
  }

  return NextResponse.json({
    checked: checkedCount,
    escalated: escalatedCount,
    timestamp: new Date().toISOString(),
  });
}
