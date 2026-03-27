// GET /api/hilfe/connections — Liste eigener Verbindungen
// POST /api/hilfe/connections — Organische Verbindung erstellen (Senior bestaetigt Match)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Verbindungen als Helfer
  const { data: helperProfile } = await supabase
    .from('neighborhood_helpers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  // Verbindungen als Helfer ODER als Senior
  const { data: connections } = await supabase
    .from('helper_connections')
    .select('*')
    .or(
      helperProfile
        ? `helper_id.eq.${helperProfile.id},resident_id.eq.${user.id}`
        : `resident_id.eq.${user.id}`
    )
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  return NextResponse.json(connections || []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { helper_id } = await request.json();
  if (!helper_id) {
    return NextResponse.json({ error: 'helper_id erforderlich' }, { status: 400 });
  }

  // Pruefen ob Verbindung schon existiert
  const { data: existing } = await supabase
    .from('helper_connections')
    .select('id')
    .eq('helper_id', helper_id)
    .eq('resident_id', user.id)
    .is('revoked_at', null)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Verbindung besteht bereits' }, { status: 409 });
  }

  // Bundesland-Limit pruefen
  const { data: helper } = await supabase
    .from('neighborhood_helpers')
    .select('federal_state')
    .eq('id', helper_id)
    .single();

  if (!helper) {
    return NextResponse.json({ error: 'Helfer nicht gefunden' }, { status: 404 });
  }

  const { count: activeCount } = await supabase
    .from('helper_connections')
    .select('*', { count: 'exact', head: true })
    .eq('helper_id', helper_id)
    .is('revoked_at', null)
    .not('confirmed_at', 'is', null);

  const { getMaxClients } = await import('@/lib/hilfe/federal-states');
  const maxClients = getMaxClients(helper.federal_state);

  if (maxClients !== null && (activeCount || 0) >= maxClients) {
    return NextResponse.json({
      error: `Maximale Anzahl an Klienten fuer ${helper.federal_state} erreicht (${maxClients}). Beenden Sie eine bestehende Verbindung.`,
    }, { status: 403 });
  }

  // Verbindung erstellen (unbestaetigt, Senior muss bestaetigen)
  const { data: connection, error } = await supabase
    .from('helper_connections')
    .insert({
      helper_id,
      resident_id: user.id,
      source: 'organic',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(connection, { status: 201 });
}
