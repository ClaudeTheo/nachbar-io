// app/api/youth/tasks/[id]/complete/route.ts
// Jugend-Modul: Aufgabe abschliessen + Punkte buchen
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

  // Aufgabe laden
  const { data: task } = await supabase
    .from('youth_tasks')
    .select('id, status, accepted_by, created_by, points_reward, category')
    .eq('id', id)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
  }
  if (task.status !== 'accepted') {
    return NextResponse.json({ error: 'Aufgabe muss zuerst angenommen sein' }, { status: 400 });
  }

  // Nur der Ersteller oder der Bearbeiter kann abschliessen
  const isCreator = task.created_by === user.id;
  const isAcceptor = task.accepted_by === user.id;

  if (!isCreator && !isAcceptor) {
    return NextResponse.json({ error: 'Nur Ersteller oder Bearbeiter können die Aufgabe abschließen' }, { status: 403 });
  }

  // Aufgabe als erledigt markieren
  const updates: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  };

  if (isCreator) {
    updates.confirmed_by_creator = true;
  }

  const { error: updateError } = await supabase
    .from('youth_tasks')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Aufgabe konnte nicht abgeschlossen werden' }, { status: 500 });
  }

  // Punkte buchen fuer den Bearbeiter
  if (task.accepted_by) {
    const bonus = task.category === 'technik' ? 10 : 0;
    const totalPoints = task.points_reward + bonus;

    await supabase.from('youth_points_ledger').insert({
      user_id: task.accepted_by,
      points: totalPoints,
      source_type: 'task',
      source_id: task.id,
      description: `Aufgabe erledigt: +${task.points_reward}${bonus > 0 ? ` (+${bonus} Technik-Bonus)` : ''} Punkte`,
    });
  }

  return NextResponse.json({ success: true, points_awarded: task.points_reward }, { status: 200 });
}
