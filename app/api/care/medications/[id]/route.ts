// app/api/care/medications/[id]/route.ts
// Nachbar.io — Einzelnes Medikament lesen, aktualisieren, deaktivieren

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireAuth, requireSubscription, unauthorizedResponse, requireCareAccess } from '@/lib/care/api-helpers';
import { encryptFields, decryptFields, CARE_MEDICATIONS_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';

// GET /api/care/medications/[id]
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
    .from('care_medications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Medikament nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // SICHERHEIT: Zugriffspruefung — nur Senior selbst, zugeordnete Helfer oder Admin
  if (data.senior_id !== user.id) {
    const role = await requireCareAccess(supabase, data.senior_id);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf dieses Medikament' }, { status: 403 });
  }

  // Medikamenten-Felder entschluesseln (Art. 9 DSGVO)
  return NextResponse.json(decryptFields(data, CARE_MEDICATIONS_ENCRYPTED_FIELDS));
}

// PATCH /api/care/medications/[id] — Medikament aktualisieren
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

  // SICHERHEIT: Zugriffspruefung vor dem Update
  const { data: existing } = await supabase.from('care_medications').select('senior_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Medikament nicht gefunden' }, { status: 404 });
  if (existing.senior_id !== user.id) {
    const role = await requireCareAccess(supabase, existing.senior_id);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf dieses Medikament' }, { status: 403 });
  }

  // Medikamenten-Felder verschluesseln (Art. 9 DSGVO)
  const encryptedUpdates = encryptFields(updates, CARE_MEDICATIONS_ENCRYPTED_FIELDS);

  const { data: medication, error } = await supabase
    .from('care_medications')
    .update(encryptedUpdates)
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

  // Entschluesselt zurueckgeben
  return NextResponse.json(decryptFields(medication, CARE_MEDICATIONS_ENCRYPTED_FIELDS));
}

// DELETE /api/care/medications/[id] — Medikament deaktivieren (soft delete)
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

  // SICHERHEIT: Zugriffspruefung vor dem Deaktivieren
  const { data: existingMed } = await supabase.from('care_medications').select('senior_id').eq('id', id).single();
  if (!existingMed) return NextResponse.json({ error: 'Medikament nicht gefunden' }, { status: 404 });
  if (existingMed.senior_id !== user.id) {
    const role = await requireCareAccess(supabase, existingMed.senior_id);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf dieses Medikament' }, { status: 403 });
  }

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
