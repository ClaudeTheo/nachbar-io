// app/api/organizations/[id]/members/route.ts
// Nachbar.io — Org-Mitglieder: Auflisten (GET) und Hinzufuegen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { validateOrgMemberAdd } from '@/lib/organizations';

export const dynamic = 'force-dynamic';

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Prueft ob der aktuelle User org_admin der Organisation ist.
 * Gibt { user, isAdmin } oder { error } zurueck.
 */
async function requireOrgAccess(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }) };
  }

  // Mitgliedschaft und Rolle pruefen
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Plattform-Admin hat immer Zugriff
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const isOrgAdmin = membership?.role === 'admin';
  const isPlatformAdmin = profile?.is_admin === true;

  if (!membership && !isPlatformAdmin) {
    return { error: NextResponse.json({ error: 'Kein Zugriff auf diese Organisation' }, { status: 403 }) };
  }

  return { user, isAdmin: isOrgAdmin || isPlatformAdmin };
}

/**
 * GET /api/organizations/[id]/members
 * Mitglieder der Organisation auflisten.
 * Sichtbar fuer alle Org-Mitglieder und Plattform-Admins.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireOrgAccess(id);
  if ('error' in access && access.error) return access.error;

  const serviceDb = getServiceDb();

  // Mitglieder mit User-Info laden
  const { data: members, error } = await serviceDb
    .from('org_members')
    .select('id, org_id, user_id, role, assigned_quarters, created_at')
    .eq('org_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[organizations/members] GET Fehler:', error);
    return NextResponse.json({ error: 'Mitglieder konnten nicht geladen werden' }, { status: 500 });
  }

  // User-Details separat laden
  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: users } = userIds.length > 0
    ? await serviceDb
        .from('users')
        .select('id, display_name, email_hash')
        .in('id', userIds)
    : { data: [] };

  const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

  const membersWithUsers = (members ?? []).map((m) => ({
    ...m,
    user: usersMap.get(m.user_id) ?? null,
  }));

  return NextResponse.json(membersWithUsers);
}

/**
 * POST /api/organizations/[id]/members
 * Mitglied zur Organisation hinzufuegen.
 * Nur org_admin oder Plattform-Admin.
 * Body: { user_id, role, assigned_quarters? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireOrgAccess(id);
  if ('error' in access && access.error) return access.error;

  // Nur Admins duerfen Mitglieder hinzufuegen
  if (!access.isAdmin) {
    return NextResponse.json(
      { error: 'Nur Organisations-Administratoren duerfen Mitglieder hinzufuegen' },
      { status: 403 }
    );
  }

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung
  const validation = validateOrgMemberAdd(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const serviceDb = getServiceDb();

  // Pruefen ob Organisation existiert
  const { data: org } = await serviceDb
    .from('organizations')
    .select('id')
    .eq('id', id)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
  }

  // Pruefen ob User existiert
  const { data: targetUser } = await serviceDb
    .from('users')
    .select('id')
    .eq('id', body.user_id as string)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  // Pruefen ob bereits Mitglied
  const { data: existing } = await serviceDb
    .from('org_members')
    .select('id')
    .eq('org_id', id)
    .eq('user_id', body.user_id as string)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Benutzer ist bereits Mitglied dieser Organisation' }, { status: 409 });
  }

  // Mitglied hinzufuegen
  const { data: member, error: insertError } = await serviceDb
    .from('org_members')
    .insert({
      org_id: id,
      user_id: body.user_id as string,
      role: body.role as string,
      assigned_quarters: (body.assigned_quarters as string[]) ?? [],
    })
    .select()
    .single();

  if (insertError || !member) {
    console.error('[organizations/members] POST Insert-Fehler:', insertError);
    return NextResponse.json({ error: 'Mitglied konnte nicht hinzugefuegt werden' }, { status: 500 });
  }

  // Audit-Log
  await serviceDb
    .from('org_audit_log')
    .insert({
      org_id: id,
      user_id: access.user!.id,
      action: 'member_added',
      target_user_id: body.user_id as string,
      details: { role: body.role },
    });

  return NextResponse.json(member, { status: 201 });
}
