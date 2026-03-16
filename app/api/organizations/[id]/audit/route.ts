// app/api/organizations/[id]/audit/route.ts
// Nachbar.io — Org-Audit-Log: Abrufen (GET), nur fuer org_admin

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizations/[id]/audit
 * Audit-Log der Organisation auflisten.
 * Nur fuer org_admin (via RLS) oder Plattform-Admin.
 * Query-Parameter: limit (default 50), offset (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { id } = await params;

  // Zugriffspruefung: org_admin oder Plattform-Admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const isOrgAdmin = membership?.role === 'admin';
  const isPlatformAdmin = profile?.is_admin === true;

  if (!isOrgAdmin && !isPlatformAdmin) {
    return NextResponse.json(
      { error: 'Nur Organisations-Administratoren koennen das Audit-Log einsehen' },
      { status: 403 }
    );
  }

  // Paginierung
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;

  // Audit-Eintraege laden (RLS stellt zusaetzlich sicher, dass nur berechtigte Daten kommen)
  const { data, error, count } = await supabase
    .from('org_audit_log')
    .select('*', { count: 'exact' })
    .eq('org_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[organizations/audit] GET Fehler:', error);
    return NextResponse.json({ error: 'Audit-Log konnte nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
