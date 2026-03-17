// app/api/organizations/[id]/audit/route.ts
// Nachbar.io — Org-Audit-Log: Abrufen (GET), nur fuer org_admin

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, requireOrgAccess, requireAdmin, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizations/[id]/audit
 * Audit-Log der Organisation auflisten.
 * Nur fuer org_admin oder Plattform-Admin. Erfordert Pro-Abo.
 * Query-Parameter: limit (default 50), offset (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'pro');
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, 'admin');
  if (org instanceof NextResponse) {
    // Plattform-Admin hat immer Zugriff
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  // Paginierung
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;

  // Audit-Eintraege laden (RLS stellt zusaetzlich sicher, dass nur berechtigte Daten kommen)
  const { data, error, count } = await auth.supabase
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
