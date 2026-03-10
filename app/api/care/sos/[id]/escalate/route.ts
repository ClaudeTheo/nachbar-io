// app/api/care/sos/[id]/escalate/route.ts
// Nachbar.io — Manueller Eskalations-Endpunkt: SOS-Alert auf nächste Stufe heben

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { getNextEscalationLevel, getEscalationMeta } from '@/lib/care/escalation';

// POST /api/care/sos/[id]/escalate — SOS-Alert manuell eskalieren
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer dürfen manuell eskalieren
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Aktuellen Alert abrufen, um Eskalationsstufe und Senior-ID zu ermitteln
  const { data: alert, error: alertError } = await supabase
    .from('care_sos_alerts')
    .select('id, senior_id, status, current_escalation_level, escalated_at, category')
    .eq('id', id)
    .single();

  if (alertError || !alert) {
    if (alertError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'SOS-Alert nicht gefunden' }, { status: 404 });
    }
    console.error('[care/sos/escalate] Alert-Abfrage fehlgeschlagen:', alertError);
    return NextResponse.json({ error: 'SOS-Alert konnte nicht geladen werden' }, { status: 500 });
  }

  const fromLevel: number = alert.current_escalation_level ?? 1;

  // Nächste Eskalationsstufe ermitteln — null bedeutet maximale Stufe erreicht
  const toLevel = getNextEscalationLevel(fromLevel);
  if (toLevel === null) {
    return NextResponse.json(
      { error: 'Maximale Eskalationsstufe bereits erreicht. Weitere Eskalation nicht möglich.' },
      { status: 400 }
    );
  }

  // Neuen Eskalations-Zeitstempel ans Array anhängen
  const existingEscalatedAt: string[] = Array.isArray(alert.escalated_at) ? alert.escalated_at : [];
  const updatedEscalatedAt = [...existingEscalatedAt, new Date().toISOString()];

  // Alert aktualisieren: neue Stufe, erweitertes Zeitstempel-Array, Status auf 'escalated'
  const { data: updatedAlert, error: updateError } = await supabase
    .from('care_sos_alerts')
    .update({
      current_escalation_level: toLevel,
      escalated_at: updatedEscalatedAt,
      status: 'escalated',
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedAlert) {
    console.error('[care/sos/escalate] Alert-Update fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Eskalation konnte nicht gespeichert werden' }, { status: 500 });
  }

  // Metadaten der neuen Eskalationsstufe abrufen (Label, Rolle, Kanäle)
  const escalationMeta = getEscalationMeta(toLevel);

  if (escalationMeta) {
    // Stufe 4: Kein konkreter Helfer — Admin-Alert senden
    if (escalationMeta.role === null) {
      try {
        await sendCareNotification(supabase, {
          // Admin-Alert: userId wird intern ignoriert, da alle Admins benachrichtigt werden
          userId: alert.senior_id,
          type: 'care_escalation',
          title: `[ESKALATION Stufe 4] SOS-Alert`,
          body: `SOS-Alert ${id} hat maximale Eskalationsstufe erreicht. Sofortige Intervention erforderlich.`,
          referenceId: id,
          referenceType: 'care_sos_alerts',
          url: `/care/sos/${id}`,
          channels: ['admin_alert'],
        });
      } catch (notifyError) {
        console.error('[care/sos/escalate] Admin-Benachrichtigung fehlgeschlagen:', notifyError);
      }
    } else {
      // Stufe 1-3: Alle Helfer der entsprechenden Rolle benachrichtigen
      try {
        const { data: helpers, error: helpersError } = await supabase
          .from('care_helpers')
          .select('user_id')
          .eq('role', escalationMeta.role)
          .eq('verification_status', 'verified')
          .contains('assigned_seniors', [alert.senior_id]);

        if (helpersError) {
          console.error('[care/sos/escalate] Helfer-Abfrage fehlgeschlagen:', helpersError);
        } else if (helpers && helpers.length > 0) {
          // Kanäle aus den Metadaten als mutable Array übernehmen
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
              body: `Ein SOS-Alert wurde auf Stufe ${toLevel} eskaliert. Bitte reagieren Sie sofort.`,
              referenceId: id,
              referenceType: 'care_sos_alerts',
              url: `/care/sos/${id}`,
              channels: notificationChannels,
            })
          );

          await Promise.all(notifyPromises);
        }
      } catch (notifyError) {
        // Benachrichtigungsfehler blockiert nicht die Eskalationsantwort
        console.error('[care/sos/escalate] Helfer-Benachrichtigung fehlgeschlagen:', notifyError);
      }
    }
  }

  // Audit-Log schreiben: manuelle Eskalation dokumentieren
  try {
    await writeAuditLog(supabase, {
      seniorId: alert.senior_id,
      actorId: user.id,
      eventType: 'sos_escalated',
      referenceType: 'care_sos_alerts',
      referenceId: id,
      metadata: { fromLevel, toLevel, manual: true },
    });
  } catch (auditError) {
    console.error('[care/sos/escalate] Audit-Log konnte nicht geschrieben werden:', auditError);
  }

  return NextResponse.json(updatedAlert);
}
