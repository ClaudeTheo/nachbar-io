// app/api/appointments/[id]/route.ts
// Nachbar.io — Einzelnen Termin lesen (GET), aktualisieren (PATCH), absagen (DELETE)
// Pro Medical: Status-Uebergaenge, Verschluesselung, Arzt/Patient-Zugriffskontrolle

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptField, decryptField } from '@/lib/care/field-encryption';
import {
  validateAppointmentUpdate,
} from '@/lib/appointments';
import type { AppointmentStatus } from '@/lib/appointments';

// GET /api/appointments/[id] — Einzelnen Termin abrufen
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }
    console.error('[appointments] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // Zugriffspruefung: Nur Arzt oder Patient duerfen den Termin sehen
  if (data.doctor_id !== user.id && data.patient_id !== user.id) {
    return NextResponse.json({ error: 'Kein Zugriff auf diesen Termin' }, { status: 403 });
  }

  return NextResponse.json({
    ...data,
    notes_encrypted: decryptField(data.notes_encrypted),
  });
}

// PATCH /api/appointments/[id] — Status aktualisieren, Notizen aendern
// Nur der Arzt darf den Status aendern
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Bestehenden Termin laden
  const { data: existing, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // Zugriffspruefung: Nur der Arzt darf den Status aendern
  if (existing.doctor_id !== user.id) {
    return NextResponse.json({ error: 'Nur der Arzt darf den Termin aktualisieren' }, { status: 403 });
  }

  // Validierung: Status-Uebergang pruefen
  const validation = validateAppointmentUpdate(
    { status: body.status as string, notes: body.notes as string, meeting_url: body.meeting_url as string },
    existing.status as AppointmentStatus
  );
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Update-Objekt zusammenbauen
  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.meeting_url !== undefined) updates.meeting_url = body.meeting_url;
  if (body.notes !== undefined) {
    // Notizen verschluesseln (Art. 9 DSGVO)
    updates.notes_encrypted = encryptField(body.notes as string);
  }

  const { data: appointment, error: updateError } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[appointments] Update fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Termin konnte nicht aktualisiert werden' }, { status: 500 });
  }

  return NextResponse.json({
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  });
}

// DELETE /api/appointments/[id] — Termin absagen (soft delete: status → cancelled)
// Arzt oder Patient duerfen den Termin absagen
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Bestehenden Termin laden
  const { data: existing, error: fetchError } = await supabase
    .from('appointments')
    .select('id, doctor_id, patient_id, status')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // Zugriffspruefung: Nur Arzt oder Patient duerfen absagen
  if (existing.doctor_id !== user.id && existing.patient_id !== user.id) {
    return NextResponse.json({ error: 'Kein Zugriff auf diesen Termin' }, { status: 403 });
  }

  // Pruefen ob Termin bereits abgesagt ist
  if (existing.status === 'cancelled') {
    return NextResponse.json({ error: 'Termin ist bereits abgesagt' }, { status: 400 });
  }

  // Soft Delete: Status auf 'cancelled' setzen
  const { data: appointment, error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[appointments] Absage fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Termin konnte nicht abgesagt werden' }, { status: 500 });
  }

  return NextResponse.json({
    ...appointment,
    notes_encrypted: decryptField(appointment.notes_encrypted),
  });
}
