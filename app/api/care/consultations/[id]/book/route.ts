// app/api/care/consultations/[id]/book/route.ts
// Nachbar.io — Online-Sprechstunde: Termin buchen
import { NextRequest, NextResponse } from 'next/server';
import { createCareLogger } from '@/lib/care/logger';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';
import { getProvider } from '@/lib/consultation/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createCareLogger('care/consultations/book/POST');
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) {
    log.warn('auth_failed');
    log.done(401);
    return unauthorizedResponse();
  }

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  // Slot laden
  const { data: slot, error: fetchError } = await supabase
    .from('consultation_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !slot) {
    log.done(404);
    return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
  }

  // Prüfen ob bereits gebucht
  if (slot.booked_by) {
    log.done(409);
    return NextResponse.json({ error: 'Termin ist bereits gebucht' }, { status: 409 });
  }

  if (slot.status !== 'scheduled') {
    log.done(409);
    return NextResponse.json({ error: 'Termin ist nicht mehr verfügbar' }, { status: 409 });
  }

  // Video-Raum erstellen falls noch nicht vorhanden
  let joinUrl = slot.join_url;
  let roomId = slot.room_id;
  if (!joinUrl) {
    const provider = getProvider(slot.provider_type);
    const room = await provider.createRoom(slot.id);
    joinUrl = room.joinUrl;
    roomId = room.roomId;
  }

  // Optimistisches Update mit WHERE booked_by IS NULL (Race-Condition-Schutz)
  const { data: updated, error: updateError } = await supabase
    .from('consultation_slots')
    .update({
      booked_by: user.id,
      booked_at: new Date().toISOString(),
      room_id: roomId,
      join_url: joinUrl,
    })
    .eq('id', id)
    .is('booked_by', null)
    .select()
    .single();

  if (updateError || !updated) {
    log.error('booking_failed', updateError?.message ?? 'already_booked', { slotId: id });
    log.done(409);
    return NextResponse.json({ error: 'Buchung fehlgeschlagen — evtl. bereits gebucht' }, { status: 409 });
  }

  log.info('slot_booked', { slotId: id, userId: user.id });
  log.done(200);
  return NextResponse.json(updated);
}
