// app/api/care/reports/[id]/route.ts
// Nachbar.io — Einzelnen Bericht laden

import { requireAuth, errorResponse, successResponse } from '@/lib/care/api-helpers';

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
  return successResponse(data);
}
