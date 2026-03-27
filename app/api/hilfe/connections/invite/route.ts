// POST /api/hilfe/connections/invite — Einladungs-Code generieren (Senior)
// PUT /api/hilfe/connections/invite — Code einloesen (Helfer)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInviteCode, isValidInviteCode } from '@/lib/hilfe/connections';
import { getMaxClients } from '@/lib/hilfe/federal-states';

// Senior generiert Einladungs-Code
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const code = generateInviteCode();

  return NextResponse.json({
    code,
    resident_id: user.id,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

// Helfer loest Einladungs-Code ein
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { code, resident_id } = await request.json();

  if (!code || !resident_id) {
    return NextResponse.json({ error: 'Code und Bewohner-ID erforderlich' }, { status: 400 });
  }

  if (!isValidInviteCode(code)) {
    return NextResponse.json({ error: 'Ungueltiges Code-Format' }, { status: 400 });
  }

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from('neighborhood_helpers')
    .select('id, federal_state')
    .eq('user_id', user.id)
    .single();

  if (!helper) {
    return NextResponse.json({ error: 'Kein Helfer-Profil gefunden' }, { status: 404 });
  }

  // Bundesland-Limit pruefen
  const { count: activeCount } = await supabase
    .from('helper_connections')
    .select('*', { count: 'exact', head: true })
    .eq('helper_id', helper.id)
    .is('revoked_at', null)
    .not('confirmed_at', 'is', null);

  const maxClients = getMaxClients(helper.federal_state);
  if (maxClients !== null && (activeCount || 0) >= maxClients) {
    return NextResponse.json({
      error: `Maximale Anzahl an Klienten erreicht (${maxClients}).`,
    }, { status: 403 });
  }

  // Verbindung erstellen (mit Code, aber noch unbestaetigt)
  const { data: connection, error } = await supabase
    .from('helper_connections')
    .insert({
      helper_id: helper.id,
      resident_id,
      source: 'invitation',
      invite_code: code,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Verbindung besteht bereits' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(connection, { status: 201 });
}
