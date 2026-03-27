// app/api/hilfe/care-profile/route.ts
// Nachbar Hilfe — Pflege-Profil API (Pflegestufe, Kasse, Versichertennummer)
// Versichertennummer wird verschluesselt gespeichert (Art. 9 DSGVO)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptField, decryptField } from '@/lib/care/field-encryption';

// Gueltige Pflegestufen (1-5)
const VALID_CARE_LEVELS = [1, 2, 3, 4, 5] as const;

// GET /api/hilfe/care-profile — Pflege-Profil lesen
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('hilfe_care_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[hilfe/care-profile] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Profil konnte nicht geladen werden' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Kein Pflege-Profil vorhanden' }, { status: 404 });
  }

  // Versichertennummer entschluesseln
  return NextResponse.json({
    ...data,
    insurance_number_encrypted: decryptField(data.insurance_number_encrypted),
  });
}

// POST /api/hilfe/care-profile — Pflege-Profil erstellen oder aktualisieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Request-Body einlesen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { care_level, insurance_name, insurance_number } = body;

  // Validierung: Pflegestufe (1-5, Pflichtfeld)
  if (care_level === undefined || care_level === null) {
    return NextResponse.json({ error: 'care_level ist erforderlich' }, { status: 400 });
  }
  if (typeof care_level !== 'number' || !VALID_CARE_LEVELS.includes(care_level as typeof VALID_CARE_LEVELS[number])) {
    return NextResponse.json(
      { error: `Ungueltige Pflegestufe: "${care_level}". Erlaubt: 1, 2, 3, 4, 5` },
      { status: 400 },
    );
  }

  // Validierung: Kassenname (Pflichtfeld)
  if (!insurance_name || typeof insurance_name !== 'string' || insurance_name.trim().length === 0) {
    return NextResponse.json({ error: 'insurance_name ist erforderlich' }, { status: 400 });
  }

  // Validierung: Versichertennummer (Pflichtfeld)
  if (!insurance_number || typeof insurance_number !== 'string' || insurance_number.trim().length === 0) {
    return NextResponse.json({ error: 'insurance_number ist erforderlich' }, { status: 400 });
  }

  // Versichertennummer verschluesseln (Art. 9 DSGVO)
  const encryptedNumber = encryptField(insurance_number as string);

  // Budget-Defaults nach Pflegestufe (in Cents)
  const budgetByCareLevel: Record<number, number> = {
    1: 12500, // 125 EUR
    2: 12500,
    3: 12500,
    4: 12500,
    5: 12500,
  };

  const upsertData = {
    user_id: user.id,
    care_level,
    insurance_name: (insurance_name as string).trim(),
    insurance_number_encrypted: encryptedNumber,
    monthly_budget_cents: budgetByCareLevel[care_level as number] ?? 12500,
    updated_at: new Date().toISOString(),
  };

  // Upsert: Erstellen oder aktualisieren
  const { data: profile, error } = await supabase
    .from('hilfe_care_profiles')
    .upsert(upsertData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('[hilfe/care-profile] Upsert fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Profil konnte nicht gespeichert werden' }, { status: 500 });
  }

  // Entschluesselt zurueckgeben
  return NextResponse.json(
    {
      ...profile,
      insurance_number_encrypted: decryptField(profile.insurance_number_encrypted),
    },
    { status: 201 },
  );
}
