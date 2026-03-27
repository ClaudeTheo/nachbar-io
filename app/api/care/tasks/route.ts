// app/api/care/tasks/route.ts
// Nachbar.io — Aufgabentafel: Aufgaben auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = [
  'transport', 'shopping', 'companionship', 'garden',
  'tech_help', 'pet_care', 'household', 'other',
] as const;

type TaskCategory = typeof VALID_CATEGORIES[number];

// GET /api/care/tasks — Aufgaben auflisten
export async function GET(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase } = auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? 'open';
  const category = searchParams.get('category');

  // Kategorie validieren falls angegeben
  if (category && !VALID_CATEGORIES.includes(category as TaskCategory)) {
    return NextResponse.json(
      { error: `Ungültige Kategorie: ${category}. Erlaubt: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  let query = supabase
    .from('care_tasks')
    .select('*, creator:users!creator_id(display_name), claimer:users!claimed_by(display_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[care/tasks] GET fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Aufgaben konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/care/tasks — Neue Aufgabe erstellen
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
    description?: string;
    category?: string;
    urgency?: string;
    preferred_date?: string;
    preferred_time_from?: string;
    preferred_time_to?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { title, description, category, urgency, preferred_date, preferred_time_from, preferred_time_to } = body;

  // L8: urgency validieren
  const VALID_URGENCIES = ['low', 'normal', 'high', 'urgent'];
  if (urgency && !VALID_URGENCIES.includes(urgency)) {
    return NextResponse.json(
      { error: `Ungültige Dringlichkeit: ${urgency}. Erlaubt: ${VALID_URGENCIES.join(', ')}` },
      { status: 400 }
    );
  }

  // Pflichtfeld: title (3-200 Zeichen)
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    return NextResponse.json(
      { error: 'Titel muss zwischen 3 und 200 Zeichen lang sein' },
      { status: 400 }
    );
  }

  // Beschreibung max 1000 Zeichen
  if (description && description.length > 1000) {
    return NextResponse.json(
      { error: 'Beschreibung darf maximal 1000 Zeichen lang sein' },
      { status: 400 }
    );
  }

  // Kategorie validieren
  if (category && !VALID_CATEGORIES.includes(category as TaskCategory)) {
    return NextResponse.json(
      { error: `Ungültige Kategorie: ${category}. Erlaubt: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  // Quarter-ID über household_members → households ermitteln
  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('household:households!inner(quarter_id)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (memberError || !membership?.household) {
    console.error('[care/tasks] Quartier nicht gefunden:', memberError);
    return NextResponse.json(
      { error: 'Sie sind keinem Quartier zugeordnet' },
      { status: 403 }
    );
  }

  const household = Array.isArray(membership.household) ? membership.household[0] : membership.household;
  const quarterId = (household as { quarter_id: string }).quarter_id;

  const { data: task, error: insertError } = await supabase
    .from('care_tasks')
    .insert({
      creator_id: user.id,
      quarter_id: quarterId,
      title: title.trim(),
      description: description?.trim() ?? null,
      category: category ?? 'other',
      urgency: urgency ?? 'normal',
      preferred_date: preferred_date ?? null,
      preferred_time_from: preferred_time_from ?? null,
      preferred_time_to: preferred_time_to ?? null,
    })
    .select('*, creator:users!creator_id(display_name)')
    .single();

  if (insertError || !task) {
    console.error('[care/tasks] Erstellung fehlgeschlagen:', insertError);
    return NextResponse.json({ error: 'Aufgabe konnte nicht erstellt werden' }, { status: 500 });
  }

  // Audit-Log schreiben
  await writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: 'task_created',
    referenceType: 'care_tasks',
    referenceId: task.id,
    metadata: { title: task.title, category: task.category },
  }).catch(() => {});

  return NextResponse.json(task, { status: 201 });
}
