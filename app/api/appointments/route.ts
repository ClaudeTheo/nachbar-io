// app/api/appointments/route.ts
// Nachbar.io — Termin-Buchungen auflisten (GET) und anlegen (POST)
// Pro Medical: Arzt-Patienten-Termine mit Slot-Ueberlappungspruefung

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptField, decryptField } from '@/lib/care/field-encryption';
import {
  validateAppointmentCreate,
  checkSlotAvailability,
} from '@/lib/appointments';

// GET /api/appointments — Termine auflisten
// Aerzte sehen ihre eigenen Termine, Patienten sehen ihre eigenen Termine
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const upcoming = searchParams.get('upcoming') !== 'false';

  // Termine laden, bei denen der Nutzer Arzt ODER Patient ist
  let query = supabase
    .from('appointments')
    .select('*')
    .or(`doctor_id.eq.${user.id},patient_id.eq.${user.id}`)
    .order('scheduled_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  if (upcoming) {
    query = query.gte('scheduled_at', new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error('[appointments] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Termine konnten nicht geladen werden' }, { status: 500 });
  }

  // notes_encrypted entschluesseln fuer die Antwort
  const decrypted = (data ?? []).map(appointment => ({
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  }));

  return NextResponse.json(decrypted);
}

// POST /api/appointments — Neuen Termin buchen
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung
  const validation = validateAppointmentCreate(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const doctorId = body.doctor_id as string;
  const scheduledAt = body.scheduled_at as string;
  const durationMinutes = (body.duration_minutes as number) ?? 30;
  const type = (body.type as string) ?? 'video';
  const notes = body.notes as string | undefined;
  const patientName = body.patient_name as string | undefined;
  const patientEmail = body.patient_email as string | undefined;
  const patientPhone = body.patient_phone as string | undefined;

  // Slot-Verfuegbarkeit pruefen (keine Ueberlappung)
  const slotCheck = await checkSlotAvailability(supabase, doctorId, scheduledAt, durationMinutes);
  if (!slotCheck.available) {
    return NextResponse.json({ error: slotCheck.error }, { status: 409 });
  }

  // Termin anlegen — notes verschluesseln (Art. 9 DSGVO)
  const insertData = {
    doctor_id: doctorId,
    patient_id: user.id,
    patient_name: patientName ?? null,
    patient_email: patientEmail ?? null,
    patient_phone: patientPhone ?? null,
    scheduled_at: scheduledAt,
    duration_minutes: durationMinutes,
    type,
    status: 'booked',
    notes_encrypted: encryptField(notes ?? null),
    meeting_url: null,
    reminder_sent: false,
  };

  const { data: appointment, error: insertError } = await supabase
    .from('appointments')
    .insert(insertData)
    .select()
    .single();

  if (insertError || !appointment) {
    console.error('[appointments] Termin konnte nicht erstellt werden:', insertError);
    return NextResponse.json({ error: 'Termin konnte nicht angelegt werden' }, { status: 500 });
  }

  // Entschluesselt zurueckgeben
  return NextResponse.json({
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  }, { status: 201 });
}
