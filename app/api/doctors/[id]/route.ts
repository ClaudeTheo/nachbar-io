// app/api/doctors/[id]/route.ts
// Nachbar.io — Einzelnes Arzt-Profil lesen (GET) und aktualisieren (PATCH)
// Pro Medical: GET ist öffentlich, PATCH nur für den Arzt selbst

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateDoctorProfile } from '@/lib/doctors';

// GET /api/doctors/[id] — Öffentliches Arzt-Profil abrufen
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('id, user_id, specialization, bio, avatar_url, visible, accepts_new_patients, video_consultation, quarter_ids, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Arzt-Profil nicht gefunden' }, { status: 404 });
    }
    console.error('[doctors] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // Nicht-sichtbare Profile nur für den Arzt selbst anzeigen
  if (!data.visible) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== data.user_id) {
      return NextResponse.json({ error: 'Arzt-Profil nicht gefunden' }, { status: 404 });
    }
  }

  return NextResponse.json(data);
}

// PATCH /api/doctors/[id] — Eigenes Arzt-Profil aktualisieren
// Nur der Arzt selbst darf sein Profil ändern
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

  // Bestehendes Profil laden
  const { data: existing, error: fetchError } = await supabase
    .from('doctor_profiles')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Arzt-Profil nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  // Zugriffsprüfung: Nur der Arzt selbst darf sein Profil ändern
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Nur der Arzt selbst darf sein Profil ändern' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung
  const validation = validateDoctorProfile(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Update-Objekt zusammenbauen (nur erlaubte Felder)
  const allowedFields = ['specialization', 'bio', 'avatar_url', 'visible', 'accepts_new_patients', 'video_consultation', 'quarter_ids'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen angegeben' }, { status: 400 });
  }

  const { data: profile, error: updateError } = await supabase
    .from('doctor_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[doctors] Update fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Profil konnte nicht aktualisiert werden' }, { status: 500 });
  }

  return NextResponse.json(profile);
}
