// app/api/hilfe/requests/route.ts
// Nachbar Hilfe — Hilfe-Gesuche auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { HelpCategory } from '@/lib/hilfe/types';

const VALID_CATEGORIES: HelpCategory[] = [
  'einkaufen', 'begleitung', 'haushalt', 'garten', 'technik', 'vorlesen', 'sonstiges',
];

// GET /api/hilfe/requests — Offene Hilfe-Gesuche auflisten
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const quarterId = searchParams.get('quarter_id');

  let query = supabase
    .from('help_requests')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (quarterId) {
    query = query.eq('quarter_id', quarterId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Hilfe-Gesuche konnten nicht geladen werden' }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/hilfe/requests — Neues Hilfe-Gesuch erstellen
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: {
    quarter_id?: string;
    category?: string;
    description?: string | null;
    preferred_time?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { quarter_id, category, description, preferred_time } = body;

  // Pflichtfeld: quarter_id
  if (!quarter_id) {
    return NextResponse.json({ error: 'quarter_id ist erforderlich' }, { status: 400 });
  }

  // Kategorie validieren
  if (!category || !VALID_CATEGORIES.includes(category as HelpCategory)) {
    return NextResponse.json(
      { error: `Ungueltige Kategorie: ${category}. Erlaubt: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 },
    );
  }

  const { data: helpRequest, error: insertError } = await supabase
    .from('help_requests')
    .insert({
      user_id: user.id,
      quarter_id,
      category,
      description: description ?? null,
      preferred_time: preferred_time ?? null,
      status: 'open',
    })
    .select()
    .single();

  if (insertError || !helpRequest) {
    console.error('[hilfe/requests] Erstellen fehlgeschlagen:', insertError);
    return NextResponse.json({ error: 'Hilfe-Gesuch konnte nicht erstellt werden' }, { status: 500 });
  }

  return NextResponse.json(helpRequest, { status: 201 });
}
