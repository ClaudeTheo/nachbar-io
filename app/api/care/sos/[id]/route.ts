// app/api/care/sos/[id]/route.ts
// Nachbar.io — SOS-Detail-Endpunkt: Abfrage und Status-Änderung einzelner Alerts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import type { CareSosStatus } from '@/lib/care/types';

// Erlaubte Status-Übergänge für den PATCH-Endpunkt
const ALLOWED_STATUS_TRANSITIONS: CareSosStatus[] = ['resolved', 'cancelled'];

// GET /api/care/sos/[id] — Einzelnen SOS-Alert mit Antworten und Senior-Profil abrufen
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer dürfen SOS-Details sehen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Alert mit Antworten (inkl. Helfer-Info) und Senior-Profil abfragen
  const { data: alert, error } = await supabase
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
    .eq('id', id)
    .single();

  if (error || !alert) {
    // PGRST116 = keine Zeile gefunden (PostgREST-Fehlercode)
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'SOS-Alert nicht gefunden' }, { status: 404 });
    }
    console.error('[care/sos/id] Alert-Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'SOS-Alert konnte nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(alert);
}

// PATCH /api/care/sos/[id] — SOS-Alert schließen oder abbrechen
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth-Check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Request-Body einlesen und validieren
  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { status, notes } = body;

  // Status-Feld ist Pflicht
  if (!status) {
    return NextResponse.json({ error: 'Status ist erforderlich' }, { status: 400 });
  }

  // Nur 'resolved' und 'cancelled' sind gültige Übergänge für diesen Endpunkt
  if (!ALLOWED_STATUS_TRANSITIONS.includes(status as CareSosStatus)) {
    return NextResponse.json(
      {
        error: `Ungültiger Status: "${status}". Erlaubt: ${ALLOWED_STATUS_TRANSITIONS.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const newStatus = status as 'resolved' | 'cancelled';

  // Update-Objekt aufbauen — bei 'resolved' Resolver und Zeitstempel setzen
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    ...(notes !== undefined && { notes }),
  };

  if (newStatus === 'resolved') {
    updatePayload.resolved_by = user.id;
    updatePayload.resolved_at = new Date().toISOString();
  }

  // Alert in der Datenbank aktualisieren
  const { data: updatedAlert, error: updateError } = await supabase
    .from('care_sos_alerts')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedAlert) {
    if (updateError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'SOS-Alert nicht gefunden' }, { status: 404 });
    }
    console.error('[care/sos/id] Status-Update fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'SOS-Alert konnte nicht aktualisiert werden' }, { status: 500 });
  }

  // Audit-Log schreiben: Ereignistyp je nach neuem Status
  const auditEventType = newStatus === 'resolved' ? 'sos_resolved' : 'sos_cancelled';
  try {
    await writeAuditLog(supabase, {
      seniorId: updatedAlert.senior_id,
      actorId: user.id,
      eventType: auditEventType,
      referenceType: 'care_sos_alerts',
      referenceId: id,
      metadata: { newStatus, notes: notes ?? null },
    });
  } catch (auditError) {
    // Audit-Fehler blockiert nicht die Antwort
    console.error('[care/sos/id] Audit-Log konnte nicht geschrieben werden:', auditError);
  }

  return NextResponse.json(updatedAlert);
}
