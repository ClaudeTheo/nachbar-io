// app/api/youth/tasks/[id]/route.ts
// Jugend-Modul: Einzelne Aufgabe lesen/aktualisieren
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { id } = await params;

  const { data: task, error } = await supabase
    .from('youth_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ task }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  // Nur erlaubte Felder aktualisieren
  const allowedFields = ['title', 'description', 'status', 'risk_level', 'estimated_minutes', 'points_reward'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen' }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from('youth_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Aufgabe konnte nicht aktualisiert werden' }, { status: 500 });
  }

  return NextResponse.json({ task }, { status: 200 });
}
