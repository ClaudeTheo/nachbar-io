// app/api/care/consultations/[id]/book/route.ts
// Nachbar.io — Online-Sprechstunde: Termin buchen
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCareLogger } from '@/lib/care/logger';
import { getProvider } from '@/lib/consultation/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createCareLogger('care/consultations/book/POST');
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    log.warn('auth_failed');
    log.done(401);
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

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

  // Pruefen ob bereits gebucht
  if (slot.booked_by) {
    log.done(409);
    return NextResponse.json({ error: 'Termin ist bereits gebucht' }, { status: 409 });
  }

  if (slot.status !== 'scheduled') {
    log.done(409);
    return NextResponse.json({ error: 'Termin ist nicht mehr verfuegbar' }, { status: 409 });
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
