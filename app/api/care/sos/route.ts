// app/api/care/sos/route.ts
// Nachbar.io — SOS-Auslöse- und Listendpunkt für das Care-Modul

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { canAccessFeature } from '@/lib/care/permissions';
import { requireCareAccess } from '@/lib/care/api-helpers';
import { encryptField, decryptFields, CARE_SOS_ALERTS_ENCRYPTED_FIELDS, CARE_SOS_RESPONSES_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';
import { CARE_SOS_CATEGORIES, ESCALATION_LEVELS } from '@/lib/care/constants';
import { createCareLogger } from '@/lib/care/logger';
import { getUserQuarterId } from '@/lib/quarters/helpers';
import type { CareSosCategory, CareSosSource } from '@/lib/care/types';

// Aktive Status-Werte für die Standard-GET-Anfrage
const DEFAULT_ACTIVE_STATUSES = [
  'triggered',
  'notified',
  'accepted',
  'helper_enroute',
  'escalated',
] as const;

// POST /api/care/sos — SOS auslösen
export async function POST(request: NextRequest) {
  const log = createCareLogger('care/sos/POST');
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer dürfen SOS auslösen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    log.warn('auth_failed');
    log.done(401);
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Request-Body einlesen und validieren
  let body: { category?: CareSosCategory; notes?: string; source?: CareSosSource };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { category, notes, source = 'app' } = body;

  // L8: source validieren
  const VALID_SOURCES: CareSosSource[] = ['app', 'device', 'checkin_timeout'];
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `Ungueltige Quelle: ${source}. Erlaubt: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    );
  }

  // Kategorie ist Pflichtfeld
  if (!category) {
    return NextResponse.json({ error: 'Kategorie ist erforderlich' }, { status: 400 });
  }

  // Kategorie gegen erlaubte Werte prüfen
  const validCategory = CARE_SOS_CATEGORIES.find((c) => c.id === category);
  if (!validCategory) {
    return NextResponse.json(
      { error: `Ungültige Kategorie: ${category}. Erlaubt: ${CARE_SOS_CATEGORIES.map((c) => c.id).join(', ')}` },
      { status: 400 }
    );
  }

  // Feature-Gate: medical_emergency immer erlaubt; alle anderen benötigen sos_all
  const featureKey = category === 'medical_emergency' ? 'medical_emergency_sos' : 'sos_all';
  const hasAccess = await canAccessFeature(supabase, user.id, featureKey);
  if (!hasAccess) {
    return NextResponse.json(
      {
        error: 'Ihr Abo-Plan unterstützt diese SOS-Kategorie nicht. Bitte upgraden Sie Ihren Plan.',
        requiredFeature: featureKey,
      },
      { status: 403 }
    );
  }

  // Quartier-ID des Nutzers ermitteln
  const quarterId = await getUserQuarterId(supabase, user.id);

  // SOS-Alert in der Datenbank anlegen (notes verschluesselt — Art. 9 DSGVO)
  const { data: alert, error: insertError } = await supabase
    .from('care_sos_alerts')
    .insert({
      senior_id: user.id,
      category,
      status: 'triggered',
      current_escalation_level: 1,
      escalated_at: [],
      notes: encryptField(notes ?? null),
      source,
      quarter_id: quarterId,
    })
    .select()
    .single();

  if (insertError || !alert) {
    log.error('db_insert_failed', insertError, { userId: user.id, category });
    log.done(500);
    return NextResponse.json({ error: 'SOS konnte nicht ausgelöst werden' }, { status: 500 });
  }

  log.info('sos_triggered', { userId: user.id, alertId: alert.id, category, source, isEmergency: validCategory.isEmergency });

  // Audit-Log schreiben (nicht-blockierend)
  try {
    await writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'sos_triggered',
      referenceType: 'care_sos_alerts',
      referenceId: alert.id,
      metadata: { category, source, isEmergency: validCategory.isEmergency },
    });
  } catch (_auditError) {
    // Audit-Fehler blockiert nicht den SOS-Prozess
    log.warn('audit_log_failed', { alertId: alert.id });
  }

  // Level-1-Helfer (Nachbarn) benachrichtigen
  try {
    // Alle verifizierten Nachbarn abrufen, denen dieser Senior zugewiesen ist
    const { data: level1Helpers, error: helpersError } = await supabase
      .from('care_helpers')
      .select('user_id')
      .eq('role', ESCALATION_LEVELS[0].role)
      .eq('verification_status', 'verified')
      .contains('assigned_seniors', [user.id]);

    if (helpersError) {
      log.error('helpers_query_failed', helpersError, { alertId: alert.id });
    } else if (level1Helpers && level1Helpers.length > 0) {
      log.info('helpers_notified', { alertId: alert.id, helperCount: level1Helpers.length, level: 1 });
      // Benachrichtigungsinhalt je nach Kategorie aufbauen
      const notificationTitle = validCategory.isEmergency
        ? `NOTFALL: ${validCategory.label}`
        : `SOS: ${validCategory.label}`;
      const notificationBody = `Ihr Nachbar braucht Hilfe. Bitte reagieren Sie jetzt.`;

      // Jeden Helfer einzeln benachrichtigen (readonly-Array in mutable umwandeln)
      const notificationChannels = [...ESCALATION_LEVELS[0].channels] as ('push' | 'in_app')[];
      const notifyPromises = level1Helpers.map((helper) =>
        sendCareNotification(supabase, {
          userId: helper.user_id,
          type: 'care_sos',
          title: notificationTitle,
          body: notificationBody,
          referenceId: alert.id,
          referenceType: 'care_sos_alerts',
          url: `/care/sos/${alert.id}`,
          channels: notificationChannels,
        })
      );

      await Promise.all(notifyPromises);

      // Alert-Status auf 'notified' aktualisieren, wenn Helfer benachrichtigt wurden
      const { error: updateError } = await supabase
        .from('care_sos_alerts')
        .update({ status: 'notified' })
        .eq('id', alert.id);

      if (updateError) {
        log.error('status_update_failed', updateError, { alertId: alert.id, targetStatus: 'notified' });
      } else {
        alert.status = 'notified';
      }
    }
  } catch (notifyError) {
    // Benachrichtigungsfehler blockiert nicht die SOS-Antwort
    log.error('notification_failed', notifyError, { alertId: alert.id });
  }

  // Entschluesselt zurueckgeben
  log.done(201, { alertId: alert.id, status: alert.status });
  return NextResponse.json(decryptFields(alert, CARE_SOS_ALERTS_ENCRYPTED_FIELDS), { status: 201 });
}

// GET /api/care/sos — Aktive SOS-Alerts abrufen
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth-Check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Query-Parameter auslesen
  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get('status');
  const seniorId = searchParams.get('senior_id');

  // Status-Filter: Komma-getrennte Liste oder Standard-Aktivstatus
  const statusFilter: string[] = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : [...DEFAULT_ACTIVE_STATUSES];

  // SOS-Alerts mit Joins auf Antworten und Senioren-Profil abrufen
  let query = supabase
    .from('care_sos_alerts')
    .select(
      `*,
      responses:care_sos_responses(
        id,
        helper_id,
        response_type,
        eta_minutes,
        note,
        created_at,
        helper:users(display_name, avatar_url)
      ),
      senior:users!care_sos_alerts_senior_id_fkey(
        display_name,
        avatar_url
      )`
    )
    .in('status', statusFilter)
    .order('created_at', { ascending: false })
    .limit(50);

  // SICHERHEIT: Zugriffskontrolle — ohne senior_id nur eigene Alerts oder als Helfer zugeordnete
  if (seniorId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
    query = query.eq('senior_id', seniorId);
  } else {
    // Pruefe ob User Admin ist
    const { data: userData } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
    if (!userData?.is_admin) {
      // Nicht-Admin: Nur eigene Alerts + Alerts von zugeordneten Senioren
      const { data: helperData } = await supabase
        .from('care_helpers')
        .select('assigned_seniors')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified')
        .maybeSingle();

      const assignedSeniors: string[] = helperData?.assigned_seniors ?? [];
      const allowedIds = [user.id, ...assignedSeniors];
      query = query.in('senior_id', allowedIds);
    }
    // Admins sehen alle Alerts (kein Filter)
  }

  const { data, error } = await query;

  if (error) {
    console.error(JSON.stringify({ level: 'error', route: 'care/sos/GET', event: 'alerts_query_failed', error: error.message }));
    return NextResponse.json({ error: 'SOS-Alerts konnten nicht geladen werden' }, { status: 500 });
  }

  // SOS-Notes und Response-Notes entschluesseln (Art. 9 DSGVO)
  const decryptedAlerts = (data ?? []).map((alert: Record<string, unknown>) => {
    const decryptedAlert = decryptFields(alert, CARE_SOS_ALERTS_ENCRYPTED_FIELDS);
    if (Array.isArray(decryptedAlert.responses)) {
      decryptedAlert.responses = (decryptedAlert.responses as Record<string, unknown>[]).map(
        (resp) => decryptFields(resp, CARE_SOS_RESPONSES_ENCRYPTED_FIELDS)
      );
    }
    return decryptedAlert;
  });

  return NextResponse.json(decryptedAlerts);
}
