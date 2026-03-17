// app/api/care/appointments/route.ts
// Nachbar.io — Termine auflisten (GET) und anlegen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireAuth, requireSubscription, unauthorizedResponse, requireCareAccess } from '@/lib/care/api-helpers';
import { encryptFields, decryptFields, decryptFieldsArray, CARE_APPOINTMENTS_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';
import type { CareAppointmentType } from '@/lib/care/types';

// GET /api/care/appointments — Termine abrufen
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
  const upcoming = searchParams.get('upcoming') !== 'false';

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  let query = supabase
    .from('care_appointments')
    .select('*')
    .eq('senior_id', seniorId)
    .order('scheduled_at', { ascending: true });

  if (upcoming) {
    query = query.gte('scheduled_at', new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error('[care/appointments] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Termine konnten nicht geladen werden' }, { status: 500 });
  }

  // Termin-Felder entschluesseln (Art. 9 DSGVO)
  try {
    return NextResponse.json(decryptFieldsArray(data ?? [], CARE_APPOINTMENTS_ENCRYPTED_FIELDS));
  } catch (decryptError) {
    console.error('[care/appointments] Entschluesselung fehlgeschlagen:', decryptError);
    // Daten ohne Entschluesselung zurueckgeben damit die Seite nicht abstuerzt
    return NextResponse.json(data ?? []);
  }
}

// POST /api/care/appointments — Neuen Termin anlegen
export async function POST(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: {
    title?: string;
    scheduled_at?: string;
    type?: CareAppointmentType;
    duration_minutes?: number;
    location?: string;
    reminder_minutes_before?: number[];
    recurrence?: Record<string, unknown>;
    notes?: string;
    senior_id?: string;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { title, scheduled_at, type, duration_minutes, location, reminder_minutes_before, recurrence, notes, senior_id } = body;

  if (!title || !scheduled_at) {
    return NextResponse.json({ error: 'Titel und Termindatum sind erforderlich' }, { status: 400 });
  }

  const targetSeniorId = senior_id ?? user.id;

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (targetSeniorId !== user.id) {
    const role = await requireCareAccess(supabase, targetSeniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  // Termin-Felder verschluesseln (Art. 9 DSGVO)
  const insertData = encryptFields({
    senior_id: targetSeniorId,
    title,
    scheduled_at,
    type: type ?? 'other',
    duration_minutes: duration_minutes ?? 60,
    location: location ?? null,
    reminder_minutes_before: reminder_minutes_before ?? [60, 15],
    recurrence: recurrence ?? null,
    notes: notes ?? null,
    managed_by: user.id,
  }, CARE_APPOINTMENTS_ENCRYPTED_FIELDS);

  const { data: appointment, error: insertError } = await supabase
    .from('care_appointments')
    .insert(insertData)
    .select()
    .single();

  if (insertError || !appointment) {
    console.error('[care/appointments] Termin konnte nicht erstellt werden:', insertError);
    return NextResponse.json({ error: 'Termin konnte nicht angelegt werden' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    seniorId: targetSeniorId,
    actorId: user.id,
    eventType: 'appointment_confirmed',
    referenceType: 'care_appointments',
    referenceId: appointment.id,
    metadata: { action: 'created', title, scheduled_at },
  }).catch(() => {});

  // Entschluesselt zurueckgeben
  return NextResponse.json(decryptFields(appointment, CARE_APPOINTMENTS_ENCRYPTED_FIELDS), { status: 201 });
}
