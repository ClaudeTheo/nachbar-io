// app/api/care/reports/[id]/route.ts
// Nachbar.io — Einzelnen Bericht laden

import { requireAuth, requireCareAccess, errorResponse, successResponse } from '@/lib/care/api-helpers';

/**
 * GET /api/care/reports/[id]
 * Einzelnes Dokument per ID laden.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from('care_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return errorResponse('Dokument nicht gefunden', 404);

  // SICHERHEIT: Zugriffspruefung — nur Senior, zugeordnete Helfer oder Admin
  if (data.senior_id !== auth.user.id) {
    const role = await requireCareAccess(supabase, data.senior_id);
    if (!role) return errorResponse('Kein Zugriff auf dieses Dokument', 403);
  }

  return successResponse(data);
}
