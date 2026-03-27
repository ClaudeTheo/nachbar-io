// app/api/doctors/route.ts
// Nachbar.io — Öffentliche Arzt-Liste (GET)
// Pro Medical: Sichtbare Ärzte mit optionaler Filterung nach Quartier und Fachgebiet

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/doctors — Öffentliche Liste sichtbarer Ärzte
// Filter: ?quarter_id=UUID, ?specialization=Allgemeinmedizin
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const quarterId = searchParams.get('quarter_id');
  const specialization = searchParams.get('specialization');

  // Nur sichtbare Profile laden
  let query = supabase
    .from('doctor_profiles')
    .select('id, user_id, specialization, bio, avatar_url, visible, accepts_new_patients, video_consultation, quarter_ids, created_at')
    .eq('visible', true)
    .order('created_at', { ascending: false });

  // Filter: Quartier (quarter_ids enthält die gesuchte UUID)
  if (quarterId) {
    query = query.contains('quarter_ids', [quarterId]);
  }

  // Filter: Fachgebiet (specialization enthält den gesuchten String)
  if (specialization) {
    query = query.contains('specialization', [specialization]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[doctors] Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Ärzte konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
