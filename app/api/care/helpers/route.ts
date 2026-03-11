// app/api/care/helpers/route.ts
// Nachbar.io — Helfer auflisten (GET) und registrieren (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireCareAccess } from '@/lib/care/api-helpers';
import type { CareHelperRole } from '@/lib/care/types';

const VALID_ROLES: CareHelperRole[] = ['neighbor', 'relative', 'care_service'];

// GET /api/care/helpers — Helfer auflisten
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id');
  const role = searchParams.get('role');
  const status = searchParams.get('status') ?? 'verified';

  let query = supabase
    .from('care_helpers')
    .select('*, user:users(display_name, avatar_url)')
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('verification_status', status);
  if (role) query = query.eq('role', role);
  if (seniorId) {
    // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
    if (seniorId !== user.id) {
      const careRole = await requireCareAccess(supabase, seniorId);
      if (!careRole) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
    }
    query = query.contains('assigned_seniors', [seniorId]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Helfer konnten nicht geladen werden' }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/care/helpers — Als Helfer registrieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: { role?: CareHelperRole; skills?: string[]; availability?: Record<string, unknown>; senior_ids?: string[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { role, skills = [], availability, senior_ids = [] } = body;

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Ungueltige Rolle: ${role}. Erlaubt: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  // Pruefen ob bereits registriert
  const { data: existing } = await supabase
    .from('care_helpers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Sie sind bereits als Helfer registriert' }, { status: 409 });
  }

  const { data: helper, error: insertError } = await supabase
    .from('care_helpers')
    .insert({
      user_id: user.id,
      role,
      verification_status: 'pending',
      assigned_seniors: senior_ids,
      skills,
      availability: availability ?? null,
    })
    .select('*, user:users(display_name, avatar_url)')
    .single();

  if (insertError || !helper) {
    console.error('[care/helpers] Registrierung fehlgeschlagen:', insertError);
    return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 500 });
  }

  for (const seniorId of senior_ids) {
    await writeAuditLog(supabase, {
      seniorId,
      actorId: user.id,
      eventType: 'helper_registered',
      referenceType: 'care_helpers',
      referenceId: helper.id,
      metadata: { role, skills },
    }).catch(() => {});
  }

  return NextResponse.json(helper, { status: 201 });
}
