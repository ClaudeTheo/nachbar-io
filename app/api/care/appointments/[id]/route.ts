// app/api/care/appointments/[id]/route.ts
// Nachbar.io — Einzelnen Termin lesen, aktualisieren, löschen

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireAuth, requireSubscription, unauthorizedResponse, requireCareAccess } from '@/lib/care/api-helpers';
import { encryptFields, decryptFields, CARE_APPOINTMENTS_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';

// GET /api/care/appointments/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from('care_appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // SICHERHEIT: Zugriffsprüfung — nur Senior selbst, zugeordnete Helfer oder Admin
  if (data.senior_id !== user.id) {
    const role = await requireCareAccess(supabase, data.senior_id);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Termin' }, { status: 403 });
  }

  // Termin-Felder entschlüsseln (Art. 9 DSGVO)
  return NextResponse.json(decryptFields(data, CARE_APPOINTMENTS_ENCRYPTED_FIELDS));
}

// PATCH /api/care/appointments/[id] — Termin aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const allowedFields = ['title', 'type', 'scheduled_at', 'duration_minutes', 'location', 'reminder_minutes_before', 'notes'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine aenderbaren Felder angegeben' }, { status: 400 });
  }

  // SICHERHEIT: Zugriffsprüfung vor dem Update
  const { data: existing } = await supabase.from('care_appointments').select('senior_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
  if (existing.senior_id !== user.id) {
    const role = await requireCareAccess(supabase, existing.senior_id);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Termin' }, { status: 403 });
  }

  // Termin-Felder verschlüsseln (Art. 9 DSGVO)
  const encryptedUpdates = encryptFields(updates, CARE_APPOINTMENTS_ENCRYPTED_FIELDS);

  const { data: appointment, error } = await supabase
    .from('care_appointments')
    .update(encryptedUpdates)
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

  // Entschlüsselt zurückgeben
  return NextResponse.json(decryptFields(appointment, CARE_APPOINTMENTS_ENCRYPTED_FIELDS));
}

// DELETE /api/care/appointments/[id] — Termin endgültig löschen (hard delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  // senior_id vor dem Löschen für den Audit-Log sichern
  const { data: existing, error: fetchError } = await supabase
    .from('care_appointments')
    .select('senior_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // SICHERHEIT: Zugriffsprüfung vor dem Löschen
  if (existing.senior_id !== user.id) {
    const role = await requireCareAccess(supabase, existing.senior_id);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Termin' }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from('care_appointments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[care/appointments] Löschen fehlgeschlagen:', deleteError);
    return NextResponse.json({ error: 'Termin konnte nicht gelöscht werden' }, { status: 500 });
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
