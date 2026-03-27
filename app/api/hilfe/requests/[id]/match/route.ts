// app/api/hilfe/requests/[id]/match/route.ts
// Nachbar Hilfe — Helfer-Matching: Bewerben (POST) und Bestaetigen (PUT)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/hilfe/requests/[id]/match — Helfer bewirbt sich auf ein Gesuch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { id: requestId } = await params;

  let body: { helper_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { helper_id } = body;
  if (!helper_id) {
    return NextResponse.json({ error: 'helper_id ist erforderlich' }, { status: 400 });
  }

  const { data: match, error: insertError } = await supabase
    .from('help_matches')
    .insert({
      request_id: requestId,
      helper_id,
    })
    .select()
    .single();

  if (insertError || !match) {
    console.error('[hilfe/match] Bewerbung fehlgeschlagen:', insertError);
    return NextResponse.json({ error: 'Bewerbung konnte nicht gespeichert werden' }, { status: 500 });
  }

  return NextResponse.json(match, { status: 201 });
}

// PUT /api/hilfe/requests/[id]/match — Bewohner bestaetigt einen Match
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { id: requestId } = await params;

  let body: { match_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { match_id } = body;
  if (!match_id) {
    return NextResponse.json({ error: 'match_id ist erforderlich' }, { status: 400 });
  }

  // Match bestaetigen: confirmed_at setzen
  const { data: updatedMatch, error: matchError } = await supabase
    .from('help_matches')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', match_id)
    .eq('request_id', requestId)
    .select()
    .single();

  if (matchError || !updatedMatch) {
    console.error('[hilfe/match] Bestaetigung fehlgeschlagen:', matchError);
    return NextResponse.json({ error: 'Match konnte nicht bestaetigt werden' }, { status: 500 });
  }

  // Gesuch-Status auf 'matched' setzen
  const { error: statusError } = await supabase
    .from('help_requests')
    .update({ status: 'matched' })
    .eq('id', requestId);

  if (statusError) {
    console.error('[hilfe/match] Status-Update fehlgeschlagen:', statusError);
    return NextResponse.json({ error: 'Status-Update fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json(updatedMatch, { status: 200 });
}
