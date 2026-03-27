// PUT /api/hilfe/connections/[id] — Verbindung bestätigen (Senior)
// DELETE /api/hilfe/connections/[id] — Verbindung widerrufen
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Nur der Senior (resident_id) kann bestätigen
  const { data: connection, error } = await supabase
    .from('helper_connections')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('resident_id', user.id)
    .is('confirmed_at', null)
    .is('revoked_at', null)
    .select()
    .single();

  if (error || !connection) {
    return NextResponse.json({ error: 'Verbindung nicht gefunden oder bereits bestätigt' }, { status: 404 });
  }

  return NextResponse.json(connection);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Beide Seiten können widerrufen
  const { data: connection, error } = await supabase
    .from('helper_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null)
    .select()
    .single();

  if (error || !connection) {
    return NextResponse.json({ error: 'Verbindung nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
