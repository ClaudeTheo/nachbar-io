// app/api/care/reports/data/route.ts
// Nachbar.io — Bericht-Daten (JSON) fuer Client-Rendering

import { requireAuth, requireFeature, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import { generateReportData } from '@/lib/care/reports/generator';
import type { CareDocumentType } from '@/lib/care/types';

/**
 * GET /api/care/reports/data?senior_id=...&period_start=...&period_end=...&type=...
 * Gibt Bericht-Daten als JSON zurueck fuer Client-seitiges Rendering.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  const { supabase, user } = auth;
  const url = new URL(request.url);
  const seniorId = url.searchParams.get('senior_id') ?? user.id;
  const periodStart = url.searchParams.get('period_start');
  const periodEnd = url.searchParams.get('period_end');
  const type = url.searchParams.get('type') as CareDocumentType | null;

  if (!periodStart || !periodEnd || !type) {
    return errorResponse('Parameter period_start, period_end und type erforderlich', 400);
  }

  // Feature-Gate
  const allowed = await requireFeature(supabase, seniorId, 'reports');
  if (!allowed) return errorResponse('Berichte sind in Ihrem aktuellen Plan nicht verfuegbar', 403);

  careLog('reports', 'data', { seniorId, type, periodStart, periodEnd });

  try {
    const reportData = await generateReportData(supabase, seniorId, periodStart, periodEnd, type);
    return successResponse(reportData);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return errorResponse(`Daten-Abfrage fehlgeschlagen: ${message}`, 500);
  }
}
