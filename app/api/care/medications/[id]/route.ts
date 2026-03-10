// app/api/care/medications/[id]/route.ts
// Nachbar.io — Einzelnes Medikament lesen, aktualisieren, deaktivieren

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';

// GET /api/care/medications/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { data, error } = await supabase
    .from('care_medications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Medikament nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/care/medications/[id] — Medikament aktualisieren
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

  const allowedFields = ['name', 'dosage', 'schedule', 'instructions', 'active'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine aenderbaren Felder angegeben' }, { status: 400 });
  }

  const { data: medication, error } = await supabase
    .from('care_medications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[care/medications] Update fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Medikament konnte nicht aktualisiert werden' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    seniorId: medication.senior_id,
    actorId: user.id,
    eventType: 'profile_updated',
    referenceType: 'care_medications',
    referenceId: id,
    metadata: { action: updates.active === false ? 'deactivated' : 'updated', changes: Object.keys(updates) },
  }).catch(() => {});

  return NextResponse.json(medication);
}

// DELETE /api/care/medications/[id] — Medikament deaktivieren (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { data: medication, error } = await supabase
    .from('care_medications')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Medikament konnte nicht deaktiviert werden' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    seniorId: medication.senior_id,
    actorId: user.id,
    eventType: 'profile_updated',
    referenceType: 'care_medications',
    referenceId: id,
    metadata: { action: 'deactivated' },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
