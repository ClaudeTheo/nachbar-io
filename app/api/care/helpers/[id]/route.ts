// app/api/care/helpers/[id]/route.ts
// Nachbar.io — Helfer-Details, Verifizierung, Aktualisierung

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';

// GET /api/care/helpers/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { data, error } = await supabase
    .from('care_helpers')
    .select('*, user:users(display_name, avatar_url)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Helfer nicht gefunden' }, { status: 404 });
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/care/helpers/[id] — Aktualisieren / Verifizieren / Widerrufen
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const allowedFields = ['verification_status', 'assigned_seniors', 'skills', 'availability', 'role'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  // Helfer laden um Ownership zu pruefen
  const { data: existingHelper } = await supabase
    .from('care_helpers')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existingHelper) {
    return NextResponse.json({ error: 'Helfer nicht gefunden' }, { status: 404 });
  }

  // Admin-Status pruefen
  const { data: adminCheck } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = adminCheck?.is_admin === true;

  // SICHERHEIT: Nur eigenes Profil oder Admin darf aendern
  if (existingHelper.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Helfer-Profil' }, { status: 403 });
  }

  // Sicherheitskritische Felder (verification_status, role, assigned_seniors) nur fuer Admins
  if ((updates.verification_status || updates.role || updates.assigned_seniors) && !isAdmin) {
    return NextResponse.json({ error: 'Nur Admins koennen Verifizierung, Rollen oder Senior-Zuordnungen aendern' }, { status: 403 });
  }

  if (updates.verification_status === 'verified') {
    updates.verified_by = user.id;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Keine aenderbaren Felder' }, { status: 400 });

  const { data: helper, error } = await supabase
    .from('care_helpers')
    .update(updates)
    .eq('id', id)
    .select('*, user:users(display_name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });

  if (updates.verification_status === 'verified') {
    await sendCareNotification(supabase, {
      userId: helper.user_id,
      type: 'care_helper_verified',
      title: 'Helfer-Verifizierung',
      body: 'Sie wurden als Helfer verifiziert. Sie koennen jetzt auf SOS-Alarme reagieren.',
      url: '/care',
      channels: ['push', 'in_app'],
    }).catch(() => {});

    for (const seniorId of (helper.assigned_seniors ?? [])) {
      await writeAuditLog(supabase, {
        seniorId,
        actorId: user.id,
        eventType: 'helper_verified',
        referenceType: 'care_helpers',
        referenceId: id,
        metadata: { role: helper.role },
      }).catch(() => {});
    }
  }

  return NextResponse.json(helper);
}
