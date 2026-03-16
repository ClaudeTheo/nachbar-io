// app/api/care/consultations/[id]/status/route.ts
// Nachbar.io — Online-Sprechstunde: Status-Uebergaenge (nur Host)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCareLogger } from '@/lib/care/logger';
import { encryptField } from '@/lib/care/field-encryption';
import type { ConsultationStatus } from '@/lib/care/types';

// Erlaubte Status-Uebergaenge (State-Machine)
const VALID_TRANSITIONS: Record<string, ConsultationStatus[]> = {
  scheduled: ['waiting', 'cancelled'],
  waiting: ['active', 'cancelled', 'no_show'],
  active: ['completed'],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createCareLogger('care/consultations/status/PATCH');
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    log.warn('auth_failed');
    log.done(401);
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: { status?: ConsultationStatus; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges JSON' }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ error: 'status ist erforderlich' }, { status: 400 });
  }

  // Slot laden
  const { data: slot } = await supabase
    .from('consultation_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (!slot) {
    return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
  }

  // Nur der Host darf den Status aendern
  if (slot.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Nur der Host darf den Status aendern' }, { status: 403 });
  }

  // State-Machine pruefen
  const allowed = VALID_TRANSITIONS[slot.status] || [];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({
      error: `Ungueltige Status-Aenderung: ${slot.status} → ${body.status}`,
    }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };

  // Notizen bei medizinischen Sprechstunden verschluesseln (Art. 9 DSGVO)
  if (body.notes) {
    if (slot.provider_type === 'medical') {
      updateData.notes = encryptField(body.notes);
    } else {
      updateData.notes = body.notes;
    }
  }

  const { data: updated, error } = await supabase
    .from('consultation_slots')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error('status_update_failed', error.message);
    log.done(500);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  // Audit-Log fuer medizinische Sprechstunden (strukturiertes JSON-Logging)
  // consultation_status_change ist kein CareAuditEventType, daher console.log
  if (slot.provider_type === 'medical') {
    console.log(JSON.stringify({
      audit: 'consultation_status_change',
      slotId: id,
      userId: user.id,
      from: slot.status,
      to: body.status,
      timestamp: new Date().toISOString(),
    }));
  }

  log.info('status_changed', { slotId: id, from: slot.status, to: body.status });
  log.done(200);
  return NextResponse.json(updated);
}
