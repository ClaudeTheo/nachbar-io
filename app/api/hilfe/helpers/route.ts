// app/api/hilfe/helpers/route.ts
// Nachbar Hilfe — Nachbarschaftshelfer auflisten (GET) und registrieren (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateHelperAge, isStateAvailable, getStateRules } from '@/lib/hilfe/federal-states';

// GET /api/hilfe/helpers — Verifizierte Helfer auflisten
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const quarterId = searchParams.get('quarter_id');

  let query = supabase
    .from('neighborhood_helpers')
    .select('*')
    .eq('verified', true)
    .order('created_at', { ascending: false });

  if (quarterId) {
    // Helfer nach Quartier filtern (via user -> quarter Zuordnung)
    query = query.eq('quarter_id', quarterId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Helfer konnten nicht geladen werden' }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/hilfe/helpers — Als Nachbarschaftshelfer registrieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: {
    federal_state?: string;
    date_of_birth?: string;
    hourly_rate_cents?: number;
    certification_url?: string | null;
    relationship_check?: boolean;
    household_check?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { federal_state, date_of_birth, hourly_rate_cents, certification_url, relationship_check, household_check } = body;

  // Pflichtfelder prüfen
  if (!federal_state) {
    return NextResponse.json({ error: 'Bundesland ist erforderlich' }, { status: 400 });
  }

  if (!date_of_birth) {
    return NextResponse.json({ error: 'Geburtsdatum ist erforderlich' }, { status: 400 });
  }

  if (hourly_rate_cents === undefined || hourly_rate_cents === null) {
    return NextResponse.json({ error: 'Stundensatz ist erforderlich' }, { status: 400 });
  }

  // Bundesland-Verfügbarkeit prüfen
  if (!isStateAvailable(federal_state)) {
    return NextResponse.json(
      { error: `In Bremen ist die Nachbarschaftshilfe derzeit nicht über die Pflegekasse abrechenbar.` },
      { status: 400 },
    );
  }

  // Mindestalter prüfen
  if (!validateHelperAge(federal_state, new Date(date_of_birth))) {
    return NextResponse.json(
      { error: 'Sie müssen mindestens 16 Jahre alt sein, um sich als Helfer zu registrieren.' },
      { status: 400 },
    );
  }

  // Beziehungs- und Haushaltsprüfung
  if (!relationship_check) {
    return NextResponse.json(
      { error: 'Die Bestätigung zur Beziehungsprüfung ist erforderlich.' },
      { status: 400 },
    );
  }

  if (!household_check) {
    return NextResponse.json(
      { error: 'Die Bestätigung zur Haushaltsprüfung ist erforderlich.' },
      { status: 400 },
    );
  }

  // Schulungsnachweis prüfen (landesspezifisch)
  const stateRules = getStateRules(federal_state);
  if (stateRules?.training_required && !certification_url) {
    return NextResponse.json(
      { error: 'Ein Schulungsnachweis ist in Ihrem Bundesland erforderlich. Bitte laden Sie Ihr Zertifikat hoch.' },
      { status: 400 },
    );
  }

  // Upsert auf user_id — ermöglicht erneute Registrierung nach Änderung
  const { data: helper, error: upsertError } = await supabase
    .from('neighborhood_helpers')
    .upsert(
      {
        user_id: user.id,
        federal_state,
        date_of_birth,
        hourly_rate_cents,
        certification_url: certification_url ?? null,
        relationship_check,
        household_check,
        terms_accepted_at: new Date().toISOString(),
        verified: false,
        active_client_count: 0,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (upsertError || !helper) {
    console.error('[hilfe/helpers] Registrierung fehlgeschlagen:', upsertError);
    return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json(helper, { status: 201 });
}
