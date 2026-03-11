// app/api/care/appointments/route.ts
// Nachbar.io — Termine auflisten (GET) und anlegen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { canAccessFeature } from '@/lib/care/permissions';
import type { CareAppointmentType } from '@/lib/care/types';

// GET /api/care/appointments — Termine abrufen
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;
  const upcoming = searchParams.get('upcoming') !== 'false';

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

  return NextResponse.json(data ?? []);
}

// POST /api/care/appointments — Neuen Termin anlegen
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  // Feature-Gate
  const hasAccess = await canAccessFeature(supabase, user.id, 'appointments');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Termin-Verwaltung nicht im aktuellen Plan enthalten' }, { status: 403 });
  }

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

  const { data: appointment, error: insertError } = await supabase
    .from('care_appointments')
    .insert({
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
    })
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

  return NextResponse.json(appointment, { status: 201 });
}
