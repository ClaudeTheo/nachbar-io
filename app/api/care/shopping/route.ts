// app/api/care/shopping/route.ts
// Nachbar.io — Einkaufshilfe: Liste abrufen (GET) und Anfrage erstellen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

// GET /api/care/shopping — Einkaufsanfragen auflisten
export async function GET(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? 'open';
  const quarterId = searchParams.get('quarter_id');

  let query = supabase
    .from('care_shopping_requests')
    .select('*, requester:users!requester_id(display_name), claimer:users!claimed_by(display_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (quarterId) {
    query = query.eq('quarter_id', quarterId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[care/shopping] GET Fehler:', error);
    return NextResponse.json({ error: 'Einkaufsanfragen konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/care/shopping — Neue Einkaufsanfrage erstellen
export async function POST(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: { items?: { name?: string; quantity?: string }[]; note?: string; due_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung: items Array
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Bitte geben Sie mindestens einen Artikel an' }, { status: 400 });
  }
  if (body.items.length > 30) {
    return NextResponse.json({ error: 'Maximal 30 Artikel pro Einkaufsanfrage' }, { status: 400 });
  }

  // Validierung: Einzelne Artikel
  for (const item of body.items) {
    if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
      return NextResponse.json({ error: 'Jeder Artikel muss einen Namen haben' }, { status: 400 });
    }
    if (item.name.length > 200) {
      return NextResponse.json({ error: 'Artikelname darf maximal 200 Zeichen lang sein' }, { status: 400 });
    }
  }

  // Validierung: Notiz
  if (body.note && body.note.length > 500) {
    return NextResponse.json({ error: 'Notiz darf maximal 500 Zeichen lang sein' }, { status: 400 });
  }

  // Quarter-ID aus Haushaltsmitgliedschaft ermitteln
  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('household:households!inner(quarter_id)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (memberError || !membership?.household) {
    return NextResponse.json({ error: 'Sie sind keinem Quartier zugeordnet' }, { status: 400 });
  }

  const household = Array.isArray(membership.household) ? membership.household[0] : membership.household;
  const quarterId = (household as { quarter_id: string }).quarter_id;

  // Items sanitisieren
  const sanitizedItems = body.items.map((item) => ({
    name: item.name!.trim(),
    quantity: item.quantity?.trim() ?? '',
    checked: false,
  }));

  // Einkaufsanfrage erstellen
  const { data: shopping, error: insertError } = await supabase
    .from('care_shopping_requests')
    .insert({
      requester_id: user.id,
      quarter_id: quarterId,
      items: sanitizedItems,
      note: body.note?.trim() || null,
      due_date: body.due_date || null,
      status: 'open',
    })
    .select('*, requester:users!requester_id(display_name)')
    .single();

  if (insertError || !shopping) {
    console.error('[care/shopping] POST Insert-Fehler:', insertError);
    return NextResponse.json({ error: 'Einkaufsanfrage konnte nicht erstellt werden' }, { status: 500 });
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: 'visit_logged',
    referenceType: 'care_shopping_requests',
    referenceId: shopping.id,
    metadata: { action: 'created', item_count: sanitizedItems.length },
  }).catch(() => {});

  return NextResponse.json(shopping, { status: 201 });
}
