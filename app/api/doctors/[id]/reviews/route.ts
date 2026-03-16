// app/api/doctors/[id]/reviews/route.ts
// Nachbar.io — Arzt-Bewertungen lesen (GET) und erstellen (POST)
// Pro Medical: GET ist oeffentlich, POST erfordert Authentifizierung (max 1 pro Arzt)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateReview } from '@/lib/doctors';

// GET /api/doctors/[id]/reviews — Oeffentliche Bewertungen eines Arztes
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: doctorId } = await params;
  const supabase = await createClient();

  // Pruefen ob der Arzt existiert
  const { data: doctor, error: doctorError } = await supabase
    .from('doctor_profiles')
    .select('id')
    .eq('id', doctorId)
    .single();

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Arzt-Profil nicht gefunden' }, { status: 404 });
  }

  // Nur sichtbare Bewertungen laden
  const { data, error } = await supabase
    .from('doctor_reviews')
    .select('id, doctor_id, patient_id, rating, text, visible, created_at')
    .eq('doctor_id', doctorId)
    .eq('visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[doctor-reviews] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Bewertungen konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/doctors/[id]/reviews — Bewertung abgeben (authentifiziert, max 1 pro Arzt)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: doctorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Pruefen ob der Arzt existiert
  const { data: doctor, error: doctorError } = await supabase
    .from('doctor_profiles')
    .select('id, user_id')
    .eq('id', doctorId)
    .single();

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Arzt-Profil nicht gefunden' }, { status: 404 });
  }

  // Arzt darf sich nicht selbst bewerten
  if (doctor.user_id === user.id) {
    return NextResponse.json({ error: 'Sie koennen sich nicht selbst bewerten' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung
  const validation = validateReview(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Bewertung einfuegen (UNIQUE constraint doctor_id + patient_id)
  const insertData = {
    doctor_id: doctorId,
    patient_id: user.id,
    rating: body.rating as number,
    text: (body.text as string) ?? null,
    visible: true,
  };

  const { data: review, error: insertError } = await supabase
    .from('doctor_reviews')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    // UNIQUE constraint violation (23505) — Bewertung existiert bereits
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Sie haben diesen Arzt bereits bewertet' },
        { status: 409 }
      );
    }
    console.error('[doctor-reviews] Bewertung konnte nicht erstellt werden:', insertError);
    return NextResponse.json({ error: 'Bewertung konnte nicht erstellt werden' }, { status: 500 });
  }

  return NextResponse.json(review, { status: 201 });
}
