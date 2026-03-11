// app/api/care/sos/route.ts
// Nachbar.io — SOS-Auslöse- und Listendpunkt für das Care-Modul

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { canAccessFeature } from '@/lib/care/permissions';
import { requireCareAccess } from '@/lib/care/api-helpers';
import { CARE_SOS_CATEGORIES, ESCALATION_LEVELS } from '@/lib/care/constants';
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
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer dürfen SOS auslösen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  // SOS-Alert in der Datenbank anlegen
  const { data: alert, error: insertError } = await supabase
    .from('care_sos_alerts')
    .insert({
      senior_id: user.id,
      category,
      status: 'triggered',
      current_escalation_level: 1,
      escalated_at: [],
      notes: notes ?? null,
      source,
    })
    .select()
    .single();

  if (insertError || !alert) {
    console.error('[care/sos] SOS-Alert konnte nicht erstellt werden:', insertError);
    return NextResponse.json({ error: 'SOS konnte nicht ausgelöst werden' }, { status: 500 });
  }

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
  } catch (auditError) {
    // Audit-Fehler blockiert nicht den SOS-Prozess
    console.error('[care/sos] Audit-Log konnte nicht geschrieben werden:', auditError);
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
      console.error('[care/sos] Helfer-Abfrage fehlgeschlagen:', helpersError);
    } else if (level1Helpers && level1Helpers.length > 0) {
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
        console.error('[care/sos] Status-Update auf "notified" fehlgeschlagen:', updateError);
      } else {
        alert.status = 'notified';
      }
    }
  } catch (notifyError) {
    // Benachrichtigungsfehler blockiert nicht die SOS-Antwort
    console.error('[care/sos] Benachrichtigung der Helfer fehlgeschlagen:', notifyError);
  }

  return NextResponse.json(alert, { status: 201 });
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

  // Optionaler Filter nach Senior-ID (mit Zugriffspruefung)
  if (seniorId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
    query = query.eq('senior_id', seniorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[care/sos] Alerts-Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'SOS-Alerts konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
