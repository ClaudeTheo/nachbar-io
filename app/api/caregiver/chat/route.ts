// app/api/caregiver/chat/route.ts
// Erstellt oder findet eine Konversation zwischen Caregiver und Resident
// NUR wenn aktiver caregiver_link existiert (Plus-Feature)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';

export async function POST(request: NextRequest) {
  // Auth + Plus-Subscription prüfen
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  try {
    const body = await request.json();
    const { resident_id } = body;

    if (!resident_id) {
      return NextResponse.json({ error: 'resident_id erforderlich' }, { status: 400 });
    }

    // Caregiver-Link prüfen (aktiv = nicht widerrufen)
    const { data: link, error: linkError } = await supabase
      .from('caregiver_links')
      .select('id')
      .eq('caregiver_id', user.id)
      .eq('resident_id', resident_id)
      .is('revoked_at', null)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Keine aktive Verknüpfung mit diesem Bewohner' },
        { status: 403 }
      );
    }

    // Bestehende Konversation suchen
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${resident_id}),` +
        `and(participant_1.eq.${resident_id},participant_2.eq.${user.id})`
      )
      .single();

    if (existing) {
      return NextResponse.json({ conversation_id: existing.id, created: false });
    }

    // Neue Konversation erstellen
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        participant_1: user.id,
        participant_2: resident_id,
      })
      .select('id')
      .single();

    if (convError) {
      console.error('[caregiver/chat] Konversation erstellen:', convError.message);
      return NextResponse.json({ error: 'Konversation konnte nicht erstellt werden' }, { status: 500 });
    }

    return NextResponse.json({ conversation_id: newConv.id, created: true });
  } catch (err) {
    console.error('[caregiver/chat] Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
