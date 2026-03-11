// app/api/care/medications/route.ts
// Nachbar.io — Medikamente auflisten (GET) und anlegen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { canAccessFeature } from '@/lib/care/permissions';
import { requireCareAccess } from '@/lib/care/api-helpers';
import type { MedicationSchedule } from '@/lib/care/types';

// GET /api/care/medications — Aktive Medikamente abrufen
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

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

  return NextResponse.json(data ?? []);
}

// POST /api/care/medications — Neues Medikament anlegen
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  // Feature-Gate
  const hasAccess = await canAccessFeature(supabase, user.id, 'medications');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Medikamenten-Verwaltung nicht im aktuellen Plan enthalten' }, { status: 403 });
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

  const { data: medication, error: insertError } = await supabase
    .from('care_medications')
    .insert({
      senior_id: targetSeniorId,
      name,
      dosage: dosage ?? null,
      schedule,
      instructions: instructions ?? null,
      managed_by: user.id,
      active: true,
    })
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
