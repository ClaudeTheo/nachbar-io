// app/api/youth/tasks/[id]/accept/route.ts
// Jugend-Modul: Aufgabe annehmen (min. access_level 'erweitert')
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { id } = await params;

  // Prüfe Youth-Profil und Zugangs-Stufe
  const { data: profile } = await supabase
    .from('youth_profiles')
    .select('access_level')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.access_level === 'basis') {
    return NextResponse.json(
      { error: 'Du benötigst mindestens die Stufe "Erweitert", um Aufgaben anzunehmen.' },
      { status: 403 }
    );
  }

  // Prüfe ob Aufgabe verfügbar
  const { data: task } = await supabase
    .from('youth_tasks')
    .select('id, status, created_by')
    .eq('id', id)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
  }
  if (task.status !== 'open') {
    return NextResponse.json({ error: 'Aufgabe ist nicht mehr verfügbar' }, { status: 409 });
  }
  if (task.created_by === user.id) {
    return NextResponse.json({ error: 'Du kannst deine eigene Aufgabe nicht annehmen' }, { status: 400 });
  }

  // Aufgabe annehmen
  const { data: updated, error } = await supabase
    .from('youth_tasks')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'open') // Optimistic Locking
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Aufgabe konnte nicht angenommen werden' }, { status: 409 });
  }

  return NextResponse.json({ task: updated }, { status: 200 });
}
