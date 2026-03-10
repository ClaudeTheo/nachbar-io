// app/api/care/appointments/[id]/route.ts
// Nachbar.io — Einzelnen Termin lesen, aktualisieren, loeschen

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';

// GET /api/care/appointments/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { data, error } = await supabase
    .from('care_appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/care/appointments/[id] — Termin aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const allowedFields = ['title', 'type', 'scheduled_at', 'duration_minutes', 'location', 'reminder_minutes_before', 'notes'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine aenderbaren Felder angegeben' }, { status: 400 });
  }

  const { data: appointment, error } = await supabase
    .from('care_appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[care/appointments] Update fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Termin konnte nicht aktualisiert werden' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    seniorId: appointment.senior_id,
    actorId: user.id,
    eventType: 'appointment_confirmed',
    referenceType: 'care_appointments',
    referenceId: id,
    metadata: { action: 'updated', changes: Object.keys(updates) },
  }).catch(() => {});

  return NextResponse.json(appointment);
}

// DELETE /api/care/appointments/[id] — Termin endgueltig loeschen (hard delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  // senior_id vor dem Loeschen fuer den Audit-Log sichern
  const { data: existing, error: fetchError } = await supabase
    .from('care_appointments')
    .select('senior_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from('care_appointments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[care/appointments] Loeschen fehlgeschlagen:', deleteError);
    return NextResponse.json({ error: 'Termin konnte nicht geloescht werden' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    seniorId: existing.senior_id,
    actorId: user.id,
    eventType: 'appointment_missed',
    referenceType: 'care_appointments',
    referenceId: id,
    metadata: { action: 'deleted' },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
