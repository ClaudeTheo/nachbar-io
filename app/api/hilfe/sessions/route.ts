// app/api/hilfe/sessions/route.ts
// Nachbar Hilfe — Einsatz-Dokumentation: Sessions auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/hilfe/sessions — Eigene Hilfe-Sessions auflisten (als Helfer oder Bewohner)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  // Sessions laden, bei denen der Nutzer als Helfer oder Bewohner beteiligt ist
  // Über help_matches → help_requests die Zuordnung prüfen
  const { data, error } = await supabase
    .from('help_sessions')
    .select('*')
    .order('session_date', { ascending: false });

  if (error) {
    console.error('[hilfe/sessions] Laden fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Sessions konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/hilfe/sessions — Neue Session erstellen
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: {
    match_id?: string;
    session_date?: string;
    start_time?: string;
    end_time?: string;
    activity_category?: string;
    activity_description?: string | null;
    hourly_rate_cents?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { match_id, session_date, start_time, end_time, activity_category, activity_description, hourly_rate_cents } = body;

  // Pflichtfeld: match_id
  if (!match_id) {
    return NextResponse.json({ error: 'match_id ist erforderlich' }, { status: 400 });
  }

  // Pflichtfelder prüfen
  if (!session_date || !start_time || !end_time || !activity_category || hourly_rate_cents === undefined) {
    return NextResponse.json({ error: 'Pflichtfelder: session_date, start_time, end_time, activity_category, hourly_rate_cents' }, { status: 400 });
  }

  // Zeitvalidierung: end_time muss nach start_time liegen
  const startMinutes = parseTimeToMinutes(start_time);
  const endMinutes = parseTimeToMinutes(end_time);

  if (startMinutes === null || endMinutes === null) {
    return NextResponse.json({ error: 'Ungültiges Zeitformat (erwartet HH:MM)' }, { status: 400 });
  }

  if (endMinutes <= startMinutes) {
    return NextResponse.json({ error: 'end_time muss nach start_time liegen' }, { status: 400 });
  }

  // Automatische Berechnung
  const duration_minutes = endMinutes - startMinutes;
  const total_amount_cents = Math.round(duration_minutes / 60 * hourly_rate_cents);

  const { data: session, error: insertError } = await supabase
    .from('help_sessions')
    .insert({
      match_id,
      session_date,
      start_time,
      end_time,
      duration_minutes,
      activity_category,
      activity_description: activity_description ?? null,
      hourly_rate_cents,
      total_amount_cents,
      helper_signature_url: null,
      resident_signature_url: null,
      status: 'draft',
    })
    .select()
    .single();

  if (insertError || !session) {
    console.error('[hilfe/sessions] Erstellen fehlgeschlagen:', insertError);
    return NextResponse.json({ error: 'Session konnte nicht erstellt werden' }, { status: 500 });
  }

  return NextResponse.json(session, { status: 201 });
}

/**
 * Parst "HH:MM" in Minuten seit Mitternacht.
 * Gibt null zurück bei ungültigem Format.
 */
function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}
