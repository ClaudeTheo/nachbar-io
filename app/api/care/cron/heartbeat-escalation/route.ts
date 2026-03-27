// app/api/care/cron/heartbeat-escalation/route.ts
// Nachbar.io — Heartbeat-Eskalation Cron: Prüft alle 30 Min ob Bewohner aktiv sind (Plus-Feature)
// Eskalationsstufen: 0-4h ok, 4-8h reminder, 8-12h alert, 12-24h lotse, 24h+ urgent

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { HEARTBEAT_ESCALATION } from '@/lib/care/constants';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import type { EscalationStage } from '@/lib/care/types';

/** Berechnet die Eskalationsstufe basierend auf Stunden seit letztem Heartbeat */
export function getEscalationStage(hoursAgo: number): EscalationStage | null {
  if (hoursAgo <= HEARTBEAT_ESCALATION.ok_hours) return null;
  if (hoursAgo <= HEARTBEAT_ESCALATION.reminder_hours) return 'reminder_4h';
  if (hoursAgo <= HEARTBEAT_ESCALATION.alert_hours) return 'alert_8h';
  if (hoursAgo <= HEARTBEAT_ESCALATION.lotse_hours) return 'lotse_12h';
  return 'urgent_24h';
}

// GET /api/care/cron/heartbeat-escalation — Heartbeat-Eskalation (Vercel Cron: alle 30 Minuten)
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET prüfen
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
  const now = new Date();

  // Alle aktiven Caregiver-Links mit heartbeat_visible=true laden
  // Gibt uns die Bewohner-IDs, für die Heartbeat-Monitoring aktiv ist
  const { data: activeLinks, error: linksError } = await supabase
    .from('caregiver_links')
    .select('resident_id, caregiver_id')
    .eq('heartbeat_visible', true)
    .is('revoked_at', null);

  if (linksError) {
    console.error('[care/cron/heartbeat-escalation] Caregiver-Links Abfrage fehlgeschlagen:', linksError);
    return NextResponse.json(
      { error: 'Caregiver-Links konnten nicht geladen werden' },
      { status: 500 }
    );
  }

  if (!activeLinks || activeLinks.length === 0) {
    await writeCronHeartbeat(supabase, 'heartbeat_escalation', { processed: 0, skipped: 'no_active_links' });
    return NextResponse.json({ processed: 0, message: 'Keine aktiven Heartbeat-Links' });
  }

  // Eindeutige Bewohner-IDs extrahieren
  const residentIds = [...new Set(activeLinks.map((l) => l.resident_id))];

  // Caregivers pro Bewohner (für Benachrichtigungen)
  const caregiversByResident = new Map<string, string[]>();
  for (const link of activeLinks) {
    const existing = caregiversByResident.get(link.resident_id) ?? [];
    existing.push(link.caregiver_id);
    caregiversByResident.set(link.resident_id, existing);
  }

  let reminderCount = 0;
  let alertCount = 0;
  let lotseCount = 0;
  let urgentCount = 0;
  let resolvedCount = 0;

  for (const residentId of residentIds) {
    // Letzten Heartbeat des Bewohners laden
    const { data: lastHeartbeat, error: hbError } = await supabase
      .from('heartbeats')
      .select('created_at')
      .eq('user_id', residentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hbError) {
      console.error(`[care/cron/heartbeat-escalation] Heartbeat-Abfrage für ${residentId} fehlgeschlagen:`, hbError);
      continue;
    }

    // Stunden seit letztem Heartbeat berechnen
    const hoursAgo = lastHeartbeat
      ? (now.getTime() - new Date(lastHeartbeat.created_at).getTime()) / (1000 * 60 * 60)
      : Infinity; // Kein Heartbeat -> sofort hoechste Stufe

    const stage = getEscalationStage(hoursAgo);

    // === Heartbeat vorhanden und im gruenen Bereich: Offene Events auflösen ===
    if (stage === null) {
      // Offene Eskalations-Events für diesen Bewohner auflösen
      const { data: openEvents, error: openEventsError } = await supabase
        .from('escalation_events')
        .select('id, stage, notified_users')
        .eq('resident_id', residentId)
        .is('resolved_at', null);

      if (openEventsError) {
        console.error(`[care/cron/heartbeat-escalation] Offene Events Abfrage für ${residentId} fehlgeschlagen:`, openEventsError);
        continue;
      }

      if (openEvents && openEvents.length > 0) {
        // Alle offenen Events auflösen
        const { error: resolveError } = await supabase
          .from('escalation_events')
          .update({ resolved_at: now.toISOString() })
          .eq('resident_id', residentId)
          .is('resolved_at', null);

        if (resolveError) {
          console.error(`[care/cron/heartbeat-escalation] Events auflösen für ${residentId} fehlgeschlagen:`, resolveError);
          continue;
        }

        resolvedCount += openEvents.length;

        // Entwarnung senden, wenn mindestens ein Event auf alert_8h oder hoeher war
        const hadAlert = openEvents.some(
          (e) => e.stage === 'alert_8h' || e.stage === 'lotse_12h' || e.stage === 'urgent_24h'
        );

        if (hadAlert) {
          // Entwarnung an alle Caregivers dieses Bewohners
          const caregiverIds = caregiversByResident.get(residentId) ?? [];
          for (const caregiverId of caregiverIds) {
            try {
              await sendCareNotification(supabase, {
                userId: caregiverId,
                type: 'care_heartbeat_alert',
                title: 'Entwarnung',
                body: 'Ihr Angehöriger hat sich wieder gemeldet. Die Eskalation wurde aufgelöst.',
                channels: ['push', 'in_app'],
              });
            } catch (notifyError) {
              console.error(
                `[care/cron/heartbeat-escalation] Entwarnung an ${caregiverId} fehlgeschlagen:`,
                notifyError
              );
            }
          }

          // Audit-Log: Eskalation aufgelöst
          try {
            await writeAuditLog(supabase, {
              seniorId: residentId,
              actorId: 'system',
              eventType: 'escalation_resolved',
              metadata: { resolvedEvents: openEvents.length, trigger: 'heartbeat_received' },
            });
          } catch (auditError) {
            console.error(`[care/cron/heartbeat-escalation] Audit-Log fehlgeschlagen:`, auditError);
          }
        }
      }

      continue;
    }

    // === Eskalation nötig: Prüfen ob bereits ein offenes Event für diese Stufe existiert (Dedup) ===
    const { data: existingEvent, error: existingError } = await supabase
      .from('escalation_events')
      .select('id')
      .eq('resident_id', residentId)
      .eq('stage', stage)
      .is('resolved_at', null)
      .maybeSingle();

    if (existingError) {
      console.error(`[care/cron/heartbeat-escalation] Dedup-Abfrage für ${residentId}/${stage} fehlgeschlagen:`, existingError);
      continue;
    }

    // Bereits ein offenes Event für diese Stufe -> überspringen
    if (existingEvent) {
      continue;
    }

    // Neues Eskalations-Event anlegen
    const caregiverIds = caregiversByResident.get(residentId) ?? [];

    const { data: newEvent, error: insertError } = await supabase
      .from('escalation_events')
      .insert({
        resident_id: residentId,
        stage,
        triggered_at: now.toISOString(),
        resolved_at: null,
        notified_users: caregiverIds,
      })
      .select('id')
      .single();

    if (insertError || !newEvent) {
      console.error(`[care/cron/heartbeat-escalation] Event erstellen für ${residentId}/${stage} fehlgeschlagen:`, insertError);
      continue;
    }

    // Audit-Log: Eskalation ausgelöst
    try {
      await writeAuditLog(supabase, {
        seniorId: residentId,
        actorId: 'system',
        eventType: 'escalation_triggered',
        referenceType: 'escalation_events',
        referenceId: newEvent.id,
        metadata: { stage, hoursAgo: Math.round(hoursAgo * 10) / 10 },
      });
    } catch (auditError) {
      console.error(`[care/cron/heartbeat-escalation] Audit-Log fehlgeschlagen:`, auditError);
    }

    // === Benachrichtigungen nach Eskalationsstufe senden ===
    switch (stage) {
      case 'reminder_4h': {
        // Push an den Bewohner: "Alles okay?"
        try {
          await sendCareNotification(supabase, {
            userId: residentId,
            type: 'care_heartbeat_reminder',
            title: 'Alles okay?',
            body: 'Wir haben länger nichts von Ihnen gehört. Bitte melden Sie sich kurz.',
            referenceId: newEvent.id,
            referenceType: 'escalation_events',
            url: '/care',
            channels: ['push', 'in_app'],
          });
        } catch (notifyError) {
          console.error(`[care/cron/heartbeat-escalation] Reminder an ${residentId} fehlgeschlagen:`, notifyError);
        }
        reminderCount++;
        break;
      }

      case 'alert_8h': {
        // Push + SMS an alle Caregivers
        for (const caregiverId of caregiverIds) {
          try {
            await sendCareNotification(supabase, {
              userId: caregiverId,
              type: 'care_heartbeat_alert',
              title: 'Keine Aktivität seit 8+ Stunden',
              body: 'Ihr Angehöriger hat sich seit über 8 Stunden nicht gemeldet. Bitte prüfen Sie nach.',
              referenceId: newEvent.id,
              referenceType: 'escalation_events',
              url: '/care/caregiver',
              channels: ['push', 'sms', 'in_app'],
              enableFallback: true,
            });
          } catch (notifyError) {
            console.error(`[care/cron/heartbeat-escalation] Alert an ${caregiverId} fehlgeschlagen:`, notifyError);
          }
        }
        alertCount++;
        break;
      }

      case 'lotse_12h': {
        // Quartier-Admin benachrichtigen (falls vorhanden)
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('is_admin', true);

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            try {
              await sendCareNotification(supabase, {
                userId: admin.id,
                type: 'care_escalation',
                title: 'Lotse: Bewohner inaktiv seit 12+ Stunden',
                body: 'Ein Bewohner hat seit über 12 Stunden keinen Heartbeat gesendet. Bitte eskalieren Sie.',
                referenceId: newEvent.id,
                referenceType: 'escalation_events',
                channels: ['push', 'in_app', 'admin_alert'],
              });
            } catch (notifyError) {
              console.error(`[care/cron/heartbeat-escalation] Lotse-Benachrichtigung fehlgeschlagen:`, notifyError);
            }
          }
        }
        lotseCount++;
        break;
      }

      case 'urgent_24h': {
        // Dringend: Push + SMS + Voice an alle Caregivers
        for (const caregiverId of caregiverIds) {
          try {
            await sendCareNotification(supabase, {
              userId: caregiverId,
              type: 'care_heartbeat_alert',
              title: 'DRINGEND: Keine Aktivität seit 24+ Stunden',
              body: 'Ihr Angehöriger hat sich seit über 24 Stunden nicht gemeldet. Bitte prüfen Sie SOFORT nach dem Rechten.',
              referenceId: newEvent.id,
              referenceType: 'escalation_events',
              url: '/care/caregiver',
              channels: ['push', 'sms', 'voice', 'in_app'],
              enableFallback: true,
            });
          } catch (notifyError) {
            console.error(`[care/cron/heartbeat-escalation] Urgent an ${caregiverId} fehlgeschlagen:`, notifyError);
          }
        }
        urgentCount++;
        break;
      }
    }
  }

  // Cron-Heartbeat schreiben
  await writeCronHeartbeat(supabase, 'heartbeat_escalation', {
    residents: residentIds.length,
    reminder: reminderCount,
    alert: alertCount,
    lotse: lotseCount,
    urgent: urgentCount,
    resolved: resolvedCount,
  });

  return NextResponse.json({
    processed: residentIds.length,
    reminder: reminderCount,
    alert: alertCount,
    lotse: lotseCount,
    urgent: urgentCount,
    resolved: resolvedCount,
    timestamp: now.toISOString(),
  });
}
