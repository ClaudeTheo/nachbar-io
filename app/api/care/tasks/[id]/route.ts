// app/api/care/tasks/[id]/route.ts
// Nachbar.io — Aufgabentafel: Status-Uebergaenge (PATCH) und Loeschen (DELETE)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';

export const dynamic = 'force-dynamic';

type TaskAction = 'claim' | 'unclaim' | 'start' | 'complete' | 'confirm' | 'cancel';

// Erlaubte Status-Uebergaenge: action → [erlaubte Quell-Status]
const TRANSITIONS: Record<TaskAction, string[]> = {
  claim:    ['open'],
  unclaim:  ['claimed'],
  start:    ['claimed'],
  complete: ['claimed', 'in_progress'],
  confirm:  ['done'],
  cancel:   ['open', 'claimed'],
};

// PATCH /api/care/tasks/[id] — Status-Uebergang
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { action } = body;

  if (!action || !Object.keys(TRANSITIONS).includes(action)) {
    return NextResponse.json(
      { error: `Ungueltige Aktion: ${action}. Erlaubt: ${Object.keys(TRANSITIONS).join(', ')}` },
      { status: 400 }
    );
  }

  const typedAction = action as TaskAction;

  // Aufgabe laden
  const { data: task, error: fetchError } = await supabase
    .from('care_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !task) {
    if (fetchError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Aufgabe konnte nicht geladen werden' }, { status: 500 });
  }

  // Status-Uebergang pruefen
  const allowedFrom = TRANSITIONS[typedAction];
  if (!allowedFrom.includes(task.status)) {
    return NextResponse.json(
      { error: `Aktion '${action}' ist im Status '${task.status}' nicht erlaubt` },
      { status: 409 }
    );
  }

  // Berechtigungspruefung
  const isCreator = task.creator_id === user.id;
  const isClaimer = task.claimed_by === user.id;

  // confirm/cancel: nur Ersteller
  if ((typedAction === 'confirm' || typedAction === 'cancel') && !isCreator) {
    return NextResponse.json(
      { error: 'Nur der Ersteller kann diese Aktion ausfuehren' },
      { status: 403 }
    );
  }

  // unclaim/start/complete: nur derjenige, der die Aufgabe uebernommen hat
  if ((typedAction === 'unclaim' || typedAction === 'start' || typedAction === 'complete') && !isClaimer) {
    return NextResponse.json(
      { error: 'Nur die Person, die die Aufgabe uebernommen hat, kann diese Aktion ausfuehren' },
      { status: 403 }
    );
  }

  // Update-Daten je nach Aktion zusammenstellen
  const updates: Record<string, unknown> = {};
  let newStatus: string;

  switch (typedAction) {
    case 'claim':
      newStatus = 'claimed';
      updates.claimed_by = user.id;
      updates.claimed_at = new Date().toISOString();
      break;
    case 'unclaim':
      newStatus = 'open';
      updates.claimed_by = null;
      updates.claimed_at = null;
      break;
    case 'start':
      newStatus = 'in_progress';
      break;
    case 'complete':
      newStatus = 'done';
      updates.completed_at = new Date().toISOString();
      break;
    case 'confirm':
      newStatus = 'confirmed';
      updates.confirmed_at = new Date().toISOString();
      break;
    case 'cancel':
      newStatus = 'cancelled';
      break;
  }

  updates.status = newStatus!;

  const { data: updated, error: updateError } = await supabase
    .from('care_tasks')
    .update(updates)
    .eq('id', id)
    .select('*, creator:users!creator_id(display_name), claimer:users!claimed_by(display_name)')
    .single();

  if (updateError || !updated) {
    console.error('[care/tasks] Update fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });
  }

  // Audit-Log schreiben
  const auditEventMap: Record<TaskAction, string> = {
    claim: 'task_claimed',
    unclaim: 'task_unclaimed',
    start: 'task_started',
    complete: 'task_completed',
    confirm: 'task_confirmed',
    cancel: 'task_cancelled',
  };

  await writeAuditLog(supabase, {
    seniorId: task.creator_id,
    actorId: user.id,
    eventType: auditEventMap[typedAction] as 'task_claimed',
    referenceType: 'care_tasks',
    referenceId: id,
    metadata: { action: typedAction, from_status: task.status, to_status: newStatus! },
  }).catch(() => {});

  // Push-Benachrichtigungen
  if (typedAction === 'claim') {
    // Ersteller benachrichtigen, dass jemand die Aufgabe uebernommen hat
    await sendCareNotification(supabase, {
      userId: task.creator_id,
      type: 'care_task_claimed',
      title: 'Aufgabe uebernommen',
      body: `Ihre Aufgabe "${task.title}" wurde uebernommen.`,
      referenceType: 'care_tasks',
      referenceId: id,
      url: '/care/tasks',
      channels: ['push', 'in_app'],
    }).catch(() => {});
  }

  if (typedAction === 'complete') {
    // Ersteller benachrichtigen, dass die Aufgabe erledigt wurde
    await sendCareNotification(supabase, {
      userId: task.creator_id,
      type: 'care_task_completed',
      title: 'Aufgabe erledigt',
      body: `Ihre Aufgabe "${task.title}" wurde als erledigt markiert. Bitte bestaetigen Sie die Erledigung.`,
      referenceType: 'care_tasks',
      referenceId: id,
      url: '/care/tasks',
      channels: ['push', 'in_app'],
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}

// DELETE /api/care/tasks/[id] — Aufgabe loeschen (nur Ersteller, nur offene)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  // Aufgabe laden fuer Berechtigungspruefung
  const { data: task, error: fetchError } = await supabase
    .from('care_tasks')
    .select('creator_id, status, title')
    .eq('id', id)
    .single();

  if (fetchError || !task) {
    if (fetchError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Aufgabe konnte nicht geladen werden' }, { status: 500 });
  }

  if (task.creator_id !== user.id) {
    return NextResponse.json({ error: 'Nur der Ersteller kann die Aufgabe loeschen' }, { status: 403 });
  }

  if (task.status !== 'open') {
    return NextResponse.json(
      { error: 'Nur offene Aufgaben koennen geloescht werden' },
      { status: 409 }
    );
  }

  const { error: deleteError } = await supabase
    .from('care_tasks')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[care/tasks] Loeschen fehlgeschlagen:', deleteError);
    return NextResponse.json({ error: 'Aufgabe konnte nicht geloescht werden' }, { status: 500 });
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: 'task_deleted',
    referenceType: 'care_tasks',
    referenceId: id,
    metadata: { title: task.title },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
