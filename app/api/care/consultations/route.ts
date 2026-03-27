// app/api/care/consultations/route.ts
// Nachbar.io — Online-Sprechstunde: Slots auflisten (GET) und erstellen (POST)
import { NextRequest, NextResponse } from 'next/server';
import { createCareLogger } from '@/lib/care/logger';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';
import { encryptField, decryptFieldsArray } from '@/lib/care/field-encryption';
import type { ConsultationProviderType } from '@/lib/care/types';

const VALID_PROVIDER_TYPES: ConsultationProviderType[] = ['community', 'medical'];
const ENCRYPTED_FIELDS = ['notes'];

export async function GET(request: NextRequest) {
  const log = createCareLogger('care/consultations/GET');

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

  const quarterId = request.nextUrl.searchParams.get('quarter_id');
  const myOnly = request.nextUrl.searchParams.get('my') === 'true';

  let query = supabase
    .from('consultation_slots')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (quarterId) {
    query = query.eq('quarter_id', quarterId);
  }

  if (myOnly) {
    query = query.or(`booked_by.eq.${user.id},host_user_id.eq.${user.id}`);
  }

  const { data, error } = await query;

  if (error) {
    log.error('db_error', error.message);
    log.done(500);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  // Notizen nur für Host oder gebuchten Nutzer entschlüsseln
  const decrypted = (data ?? []).map(slot => {
    if (slot.notes && (slot.host_user_id === user.id || slot.booked_by === user.id)) {
      return decryptFieldsArray([slot], ENCRYPTED_FIELDS)[0];
    }
    return { ...slot, notes: null };
  });

  log.done(200);
  return NextResponse.json(decrypted);
}

export async function POST(request: NextRequest) {
  const log = createCareLogger('care/consultations/POST');

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;

  try {
    body = await request.json();
  } catch {
    log.done(400);
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 });
  }

  // Validierung
  if (!body.quarter_id) {
    return NextResponse.json({ error: 'quarter_id ist erforderlich' }, { status: 400 });
  }
  if (!body.provider_type || !VALID_PROVIDER_TYPES.includes(body.provider_type)) {
    return NextResponse.json({ error: 'provider_type muss community oder medical sein' }, { status: 400 });
  }
  if (!body.host_name?.trim()) {
    return NextResponse.json({ error: 'host_name ist erforderlich' }, { status: 400 });
  }
  if (!body.scheduled_at || isNaN(Date.parse(body.scheduled_at))) {
    return NextResponse.json({ error: 'scheduled_at muss ein gültiges Datum sein' }, { status: 400 });
  }
  const duration = body.duration_minutes ?? 15;
  if (duration < 5 || duration > 60) {
    return NextResponse.json({ error: 'duration_minutes muss zwischen 5 und 60 liegen' }, { status: 400 });
  }

  // join_url validieren (nur HTTPS, kein javascript: etc.)
  if (body.join_url) {
    try {
      const parsed = new URL(body.join_url);
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'join_url muss eine HTTPS-URL sein' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'join_url ist keine gültige URL' }, { status: 400 });
    }
  }

  // Notizen verschlüsseln bei medizinischen Sprechstunden
  const notes = body.notes
    ? (body.provider_type === 'medical' ? encryptField(body.notes) : body.notes)
    : null;

  const { data, error } = await supabase
    .from('consultation_slots')
    .insert([{
      quarter_id: body.quarter_id,
      provider_type: body.provider_type,
      host_user_id: user.id,
      host_name: body.host_name.trim(),
      title: body.title?.trim() || 'Sprechstunde',
      scheduled_at: body.scheduled_at,
      duration_minutes: duration,
      join_url: body.join_url || null,
      notes,
    }])
    .select()
    .single();

  if (error) {
    log.error('insert_error', error.message);
    log.done(500);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  log.info('slot_created', { slotId: data.id, type: body.provider_type });
  log.done(201);
  return NextResponse.json(data, { status: 201 });
}
