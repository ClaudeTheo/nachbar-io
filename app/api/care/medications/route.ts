// app/api/care/medications/route.ts
// Nachbar.io — Medikamente auflisten (GET) und anlegen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireAuth, requireSubscription, unauthorizedResponse, requireCareAccess } from '@/lib/care/api-helpers';
import { encryptFields, decryptFieldsArray, CARE_MEDICATIONS_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';
import { checkCareConsent } from '@/lib/care/consent';
import type { MedicationSchedule } from '@/lib/care/types';

// GET /api/care/medications — Aktive Medikamente abrufen
export async function GET(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;
  const includeInactive = searchParams.get('include_inactive') === 'true';

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  let query = supabase
    .from('care_medications')
    .select('*')
    .eq('senior_id', seniorId)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[care/medications] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Medikamente konnten nicht geladen werden' }, { status: 500 });
  }

  // Medikamenten-Felder entschluesseln (Art. 9 DSGVO)
  return NextResponse.json(decryptFieldsArray(data ?? [], CARE_MEDICATIONS_ENCRYPTED_FIELDS));
}

// POST /api/care/medications — Neues Medikament anlegen
export async function POST(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  // Art. 9 DSGVO: Einwilligung prüfen
  const hasConsent = await checkCareConsent(supabase, user.id, 'medications');
  if (!hasConsent) {
    return NextResponse.json({ error: 'Einwilligung erforderlich', feature: 'medications' }, { status: 403 });
  }

  let body: { name?: string; dosage?: string; schedule?: MedicationSchedule; instructions?: string; senior_id?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { name, dosage, schedule, instructions, senior_id } = body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 200) {
    return NextResponse.json({ error: 'Name muss 2-200 Zeichen lang sein' }, { status: 400 });
  }
  if (!schedule) {
    return NextResponse.json({ error: 'Zeitplan ist erforderlich' }, { status: 400 });
  }
  if (instructions && (typeof instructions !== 'string' || instructions.length > 2000)) {
    return NextResponse.json({ error: 'Anweisungen duerfen max. 2000 Zeichen lang sein' }, { status: 400 });
  }

  if (!['daily', 'weekly', 'interval'].includes(schedule.type)) {
    return NextResponse.json({ error: 'Ungueltiger Zeitplan-Typ' }, { status: 400 });
  }

  const targetSeniorId = senior_id ?? user.id;

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (targetSeniorId !== user.id) {
    const role = await requireCareAccess(supabase, targetSeniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  // Medikamenten-Felder verschluesseln (Art. 9 DSGVO)
  const insertData = encryptFields({
    senior_id: targetSeniorId,
    name,
    dosage: dosage ?? null,
    schedule,
    instructions: instructions ?? null,
    managed_by: user.id,
    active: true,
  }, CARE_MEDICATIONS_ENCRYPTED_FIELDS);

  const { data: medication, error: insertError } = await supabase
    .from('care_medications')
    .insert(insertData)
    .select()
    .single();

  if (insertError || !medication) {
    console.error('[care/medications] Medikament konnte nicht erstellt werden:', insertError);
    return NextResponse.json({ error: 'Medikament konnte nicht angelegt werden' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    seniorId: targetSeniorId,
    actorId: user.id,
    eventType: 'profile_updated',
    referenceType: 'care_medications',
    referenceId: medication.id,
    metadata: { action: 'created', name, schedule },
  }).catch(() => {});

  return NextResponse.json(medication, { status: 201 });
}
