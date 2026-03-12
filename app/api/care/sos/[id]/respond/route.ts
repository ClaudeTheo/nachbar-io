// app/api/care/sos/[id]/respond/route.ts
// Nachbar.io — SOS-Reaktions-Endpunkt: Helfer reagiert auf einen aktiven Alert

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import type { CareSosResponseType } from '@/lib/care/types';

// Alle erlaubten Reaktionstypen für diesen Endpunkt
const VALID_RESPONSE_TYPES: CareSosResponseType[] = ['accepted', 'declined', 'arrived', 'completed'];

// POST /api/care/sos/[id]/respond — Als Helfer auf einen SOS-Alert reagieren
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Helfer dürfen reagieren
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Request-Body einlesen und validieren
  let body: { response_type?: CareSosResponseType; eta_minutes?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { response_type, eta_minutes, note } = body;

  // Reaktionstyp ist Pflichtfeld
  if (!response_type) {
    return NextResponse.json({ error: 'Reaktionstyp (response_type) ist erforderlich' }, { status: 400 });
  }

  // Reaktionstyp gegen erlaubte Werte prüfen
  if (!VALID_RESPONSE_TYPES.includes(response_type)) {
    return NextResponse.json(
      {
        error: `Ungültiger Reaktionstyp: "${response_type}". Erlaubt: ${VALID_RESPONSE_TYPES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Alert abrufen, um senior_id für Benachrichtigungen zu ermitteln
  const { data: alert, error: alertError } = await supabase
    .from('care_sos_alerts')
    .select('id, senior_id, status')
    .eq('id', id)
    .single();

  if (alertError || !alert) {
    if (alertError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'SOS-Alert nicht gefunden' }, { status: 404 });
    }
    console.error('[care/sos/respond] Alert-Abfrage fehlgeschlagen:', alertError);
    return NextResponse.json({ error: 'SOS-Alert konnte nicht geladen werden' }, { status: 500 });
  }

  // SICHERHEIT: Pruefe ob der Nutzer ein verifizierter Helfer fuer diesen Senior ist
  if (alert.senior_id !== user.id) {
    const { data: helperCheck } = await supabase
      .from('care_helpers')
      .select('id, assigned_seniors')
      .eq('user_id', user.id)
      .eq('verification_status', 'verified')
      .maybeSingle();

    const { data: adminCheck } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
    const isAssignedHelper = helperCheck?.assigned_seniors?.includes(alert.senior_id);

    if (!isAssignedHelper && !adminCheck?.is_admin) {
      return NextResponse.json(
        { error: 'Nur verifizierte Helfer duerfen auf SOS-Alerts reagieren' },
        { status: 403 }
      );
    }
  }

  // Reaktion in der Datenbank speichern
  const { data: response, error: insertError } = await supabase
    .from('care_sos_responses')
    .insert({
      sos_alert_id: id,
      helper_id: user.id,
      response_type,
      eta_minutes: eta_minutes ?? null,
      note: note ?? null,
    })
    .select()
    .single();

  if (insertError || !response) {
    console.error('[care/sos/respond] Reaktion konnte nicht gespeichert werden:', insertError);
    return NextResponse.json({ error: 'Reaktion konnte nicht gespeichert werden' }, { status: 500 });
  }

  // Status-Update und Benachrichtigung je nach Reaktionstyp
  if (response_type === 'accepted') {
    // Alert-Status auf 'accepted' setzen und Helfer als accepted_by eintragen
    const { error: updateError } = await supabase
      .from('care_sos_alerts')
      .update({
        status: 'accepted',
        accepted_by: user.id,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[care/sos/respond] Status-Update auf "accepted" fehlgeschlagen:', updateError);
    }

    // Senior benachrichtigen: Hilfe ist unterwegs
    try {
      await sendCareNotification(supabase, {
        userId: alert.senior_id,
        type: 'care_sos_response',
        title: 'Hilfe ist unterwegs!',
        body: eta_minutes
          ? `Ein Helfer ist in ca. ${eta_minutes} Minuten bei Ihnen.`
          : 'Ein Helfer hat Ihre SOS-Meldung angenommen und kommt zu Ihnen.',
        referenceId: id,
        referenceType: 'care_sos_alerts',
        url: `/care/sos/${id}`,
        channels: ['push', 'in_app'],
      });
    } catch (notifyError) {
      // Benachrichtigungsfehler blockiert nicht die Antwort
      console.error('[care/sos/respond] Senior-Benachrichtigung fehlgeschlagen:', notifyError);
    }

    // Audit-Log für Annahme schreiben
    try {
      await writeAuditLog(supabase, {
        seniorId: alert.senior_id,
        actorId: user.id,
        eventType: 'sos_accepted',
        referenceType: 'care_sos_alerts',
        referenceId: id,
        metadata: { helperId: user.id, etaMinutes: eta_minutes ?? null },
      });
    } catch (auditError) {
      console.error('[care/sos/respond] Audit-Log konnte nicht geschrieben werden:', auditError);
    }
  } else if (response_type === 'arrived') {
    // Alert-Status auf 'helper_enroute' setzen (Helfer ist eingetroffen / unterwegs)
    const { error: updateError } = await supabase
      .from('care_sos_alerts')
      .update({ status: 'helper_enroute' })
      .eq('id', id);

    if (updateError) {
      console.error('[care/sos/respond] Status-Update auf "helper_enroute" fehlgeschlagen:', updateError);
    }
  }

  return NextResponse.json(response, { status: 201 });
}
