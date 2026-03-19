// app/api/youth/tasks/route.ts
// Jugend-Modul: Aufgaben auflisten + erstellen
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_CATEGORIES = ['technik', 'garten', 'begleitung', 'digital', 'event'] as const;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const quarterId = searchParams.get('quarter_id');
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'open';

  let query = supabase
    .from('youth_tasks')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50);

  if (quarterId) {
    query = query.eq('quarter_id', quarterId);
  }
  if (category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    query = query.eq('category', category);
  }

  const { data: tasks, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Aufgaben konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json({ tasks }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    category?: string;
    quarter_id?: string;
    risk_level?: string;
    estimated_minutes?: number;
    points_reward?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { title, description, category, quarter_id, risk_level, estimated_minutes, points_reward } = body;

  // Validierung
  if (!title || title.length < 3 || title.length > 200) {
    return NextResponse.json({ error: 'Titel muss zwischen 3 und 200 Zeichen lang sein' }, { status: 400 });
  }
  if (!description || description.length < 10) {
    return NextResponse.json({ error: 'Beschreibung muss mindestens 10 Zeichen lang sein' }, { status: 400 });
  }
  if (!category || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ error: 'Ungültige Kategorie' }, { status: 400 });
  }
  if (!quarter_id) {
    return NextResponse.json({ error: 'Quartier erforderlich' }, { status: 400 });
  }

  const requiresOrg = category === 'begleitung';

  const { data: task, error } = await supabase
    .from('youth_tasks')
    .insert({
      created_by: user.id,
      quarter_id,
      title,
      description,
      category,
      risk_level: risk_level || 'niedrig',
      requires_org: requiresOrg,
      estimated_minutes: estimated_minutes || null,
      points_reward: points_reward || 20,
      status: 'open',
      moderation_status: 'approved', // Bewohner-erstellte Aufgaben direkt freigegeben
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Aufgabe konnte nicht erstellt werden' }, { status: 500 });
  }

  return NextResponse.json({ task }, { status: 201 });
}
