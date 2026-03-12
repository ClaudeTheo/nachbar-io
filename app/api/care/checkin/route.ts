// app/api/care/checkin/route.ts
// Nachbar.io — Check-in abgeben (POST) und Check-in-Historie abrufen (GET)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { requireCareAccess } from '@/lib/care/api-helpers';
import { encryptField, decryptField, decryptFields, decryptFieldsArray, CARE_CHECKINS_ENCRYPTED_FIELDS, CARE_SOS_ALERTS_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';
import type { CareCheckinStatus, CareCheckinMood } from '@/lib/care/types';

// Gültige Check-in-Status-Werte für die Eingabe
const VALID_SUBMIT_STATUSES: CareCheckinStatus[] = ['ok', 'not_well', 'need_help'];

// Status-Werte, bei denen ein bestehender Check-in aktualisiert werden kann
const PENDING_CHECKIN_STATUSES: CareCheckinStatus[] = ['reminded', 'missed'];

// POST /api/care/checkin — Check-in abgeben
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer dürfen Check-ins abgeben
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Request-Body einlesen und validieren
  let body: {
    status?: CareCheckinStatus;
    mood?: CareCheckinMood;
    note?: string;
    scheduled_at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { status, mood, note, scheduled_at } = body;

  // Status ist Pflichtfeld
  if (!status) {
    return NextResponse.json({ error: 'Status ist erforderlich' }, { status: 400 });
  }

  // Status gegen gültige Eingabe-Werte prüfen
  if (!VALID_SUBMIT_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        error: `Ungültiger Status: "${status}". Erlaubt: ${VALID_SUBMIT_STATUSES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  let checkin: Record<string, unknown>;

  // Note verschluesseln (Art. 9 DSGVO)
  const encryptedNote = encryptField(note ?? null);

  // Versuche, einen bestehenden ausstehenden Check-in zu aktualisieren, wenn scheduled_at angegeben
  if (scheduled_at) {
    const { data: existing, error: updateError } = await supabase
      .from('care_checkins')
      .update({
        status,
        mood: mood ?? null,
        note: encryptedNote,
        completed_at: now,
      })
      .eq('senior_id', user.id)
      .eq('scheduled_at', scheduled_at)
      .in('status', PENDING_CHECKIN_STATUSES)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('[care/checkin] Bestehender Check-in konnte nicht aktualisiert werden:', updateError);
      return NextResponse.json(
        { error: 'Check-in konnte nicht aktualisiert werden' },
        { status: 500 }
      );
    }

    if (existing) {
      // Vorhandener Check-in wurde erfolgreich aktualisiert
      checkin = existing;
    } else {
      // Kein passender ausstehender Eintrag gefunden → neuen Check-in erstellen
      const { data: newCheckin, error: insertError } = await supabase
        .from('care_checkins')
        .insert({
          senior_id: user.id,
          status,
          mood: mood ?? null,
          note: encryptedNote,
          scheduled_at,
          completed_at: now,
          escalated: false,
        })
        .select()
        .single();

      if (insertError || !newCheckin) {
        console.error('[care/checkin] Check-in konnte nicht erstellt werden:', insertError);
        return NextResponse.json({ error: 'Check-in konnte nicht gespeichert werden' }, { status: 500 });
      }
      checkin = newCheckin;
    }
  } else {
    // Neuen Check-in ohne geplanten Zeitpunkt anlegen
    const { data: newCheckin, error: insertError } = await supabase
      .from('care_checkins')
      .insert({
        senior_id: user.id,
        status,
        mood: mood ?? null,
        note: encryptedNote,
        scheduled_at: now,
        completed_at: now,
        escalated: false,
      })
      .select()
      .single();

    if (insertError || !newCheckin) {
      console.error('[care/checkin] Check-in konnte nicht erstellt werden:', insertError);
      return NextResponse.json({ error: 'Check-in konnte nicht gespeichert werden' }, { status: 500 });
    }
    checkin = newCheckin;
  }

  // Audit-Log schreiben: ok → checkin_ok, not_well/need_help → checkin_not_well
  const auditEventType = status === 'ok' ? 'checkin_ok' : 'checkin_not_well';
  try {
    await writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: auditEventType,
      referenceType: 'care_checkins',
      referenceId: checkin.id as string,
      metadata: { status, mood: mood ?? null, hasNote: !!note },
    });
  } catch (auditError) {
    // Audit-Fehler blockiert nicht den Check-in-Prozess
    console.error('[care/checkin] Audit-Log konnte nicht geschrieben werden:', auditError);
  }

  // Bei "not_well": Angehörige benachrichtigen
  if (status === 'not_well') {
    try {
      // Alle verifizierten Angehörigen abrufen, die diesem Senior zugewiesen sind
      const { data: relatives, error: relativesError } = await supabase
        .from('care_helpers')
        .select('user_id')
        .eq('role', 'relative')
        .eq('verification_status', 'verified')
        .contains('assigned_seniors', [user.id]);

      if (relativesError) {
        console.error('[care/checkin] Angehörigen-Abfrage fehlgeschlagen:', relativesError);
      } else if (relatives && relatives.length > 0) {
        const notifyPromises = relatives.map((relative) =>
          sendCareNotification(supabase, {
            userId: relative.user_id,
            type: 'care_checkin_missed',
            title: 'Check-in: Nicht so gut',
            body: `Ihr Angehöriger hat gemeldet, dass er sich nicht wohl fühlt.${note ? ` Hinweis: ${note}` : ''}`,
            referenceId: checkin!.id as string,
            referenceType: 'care_checkins',
            url: `/care/checkin/${checkin!.id}`,
            channels: ['push', 'in_app'],
          })
        );
        await Promise.all(notifyPromises);
      }
    } catch (notifyError) {
      // Benachrichtigungsfehler blockiert nicht die Check-in-Antwort
      console.error('[care/checkin] Angehörigen-Benachrichtigung fehlgeschlagen:', notifyError);
    }
  }

  // Bei "need_help": SOS-Alert direkt in der Datenbank anlegen (kein internes fetch wegen Cookie-Weiterleitung)
  if (status === 'need_help') {
    try {
      const { error: sosError } = await supabase.from('care_sos_alerts').insert({
        senior_id: user.id,
        category: 'general_help',
        status: 'triggered',
        current_escalation_level: 1,
        escalated_at: [],
        notes: encryptField(note || 'Hilfe ueber Check-in angefordert'),
        source: 'checkin_timeout',
      });

      if (sosError) {
        console.error('[care/checkin] SOS-Erstellung fehlgeschlagen:', sosError);
      }
    } catch (e) {
      console.error('[care/checkin] SOS fehlgeschlagen:', e);
    }
  }

  // Entschluesselt zurueckgeben
  return NextResponse.json(decryptFields(checkin as Record<string, unknown>, CARE_CHECKINS_ENCRYPTED_FIELDS), { status: 201 });
}

// GET /api/care/checkin — Check-in-Historie abrufen
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
  const seniorId = searchParams.get('senior_id') ?? user.id;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 30, 1), 100) : 30;

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  // Check-in-Historie aus der Datenbank abrufen, absteigend nach geplantem Zeitpunkt
  const { data, error } = await supabase
    .from('care_checkins')
    .select('*')
    .eq('senior_id', seniorId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[care/checkin] Historie-Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Check-in-Historie konnte nicht geladen werden' }, { status: 500 });
  }

  // Check-in-Notizen entschluesseln (Art. 9 DSGVO)
  return NextResponse.json(decryptFieldsArray(data ?? [], CARE_CHECKINS_ENCRYPTED_FIELDS));
}
