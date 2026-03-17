// app/api/care/reports/route.ts
// Nachbar.io — Berichte-API: Liste und Generierung

import { NextResponse } from 'next/server';
import { requireAuth, requireSubscription, requireFeature, requireCareAccess, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import { generateReportData } from '@/lib/care/reports/generator';
import { writeAuditLog } from '@/lib/care/audit';
import type { CareDocumentType } from '@/lib/care/types';

const VALID_TYPES: CareDocumentType[] = [
  'care_report_daily', 'care_report_weekly', 'care_report_monthly',
  'emergency_log', 'medication_report', 'care_aid_application',
  'tax_summary', 'usage_report',
];

const TYPE_LABELS: Record<CareDocumentType, string> = {
  care_report_daily: 'Tagesbericht',
  care_report_weekly: 'Wochenbericht',
  care_report_monthly: 'Monatsbericht',
  emergency_log: 'Notfall-Protokoll',
  medication_report: 'Medikamenten-Bericht',
  care_aid_application: 'Pflegehilfsmittel-Antrag',
  tax_summary: 'Steuer-Zusammenfassung',
  usage_report: 'Nutzungsbericht',
};

/**
 * GET /api/care/reports?senior_id=...
 * Liste aller Dokumente fuer einen Senior.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;
  const url = new URL(request.url);
  const seniorId = url.searchParams.get('senior_id') ?? user.id;

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return errorResponse('Kein Zugriff auf diesen Senior', 403);
  }

  // Feature-Gate: reports
  const allowed = await requireFeature(supabase, seniorId, 'reports');
  if (!allowed) return errorResponse('Berichte sind in Ihrem aktuellen Plan nicht verfuegbar', 403);

  careLog('reports', 'list', { seniorId });

  const { data, error } = await supabase
    .from('care_documents')
    .select('*')
    .eq('senior_id', seniorId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return errorResponse(error.message, 500);
  return successResponse(data ?? []);
}

/**
 * POST /api/care/reports
 * Bericht generieren und als Dokument speichern.
 * Body: { type, period_start, period_end, senior_id? }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) return errorResponse('Nicht autorisiert', 401);

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: { type?: string; period_start?: string; period_end?: string; senior_id?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungueltiger Request-Body', 400);
  }

  const { type, period_start, period_end } = body;
  const seniorId = body.senior_id ?? user.id;

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return errorResponse('Kein Zugriff auf diesen Senior', 403);
  }

  // Validierung
  if (!type || !VALID_TYPES.includes(type as CareDocumentType)) {
    return errorResponse('Ungueltiger Berichtstyp', 400);
  }
  if (!period_start || !period_end) {
    return errorResponse('Zeitraum (period_start, period_end) erforderlich', 400);
  }

  // Feature-Gate
  const allowed = await requireFeature(supabase, seniorId, 'reports');
  if (!allowed) return errorResponse('Berichte sind in Ihrem aktuellen Plan nicht verfuegbar', 403);

  careLog('reports', 'generate', { seniorId, type, period_start, period_end });

  try {
    // Bericht-Daten generieren
    const reportData = await generateReportData(
      supabase, seniorId, period_start, period_end, type as CareDocumentType
    );

    // Titel automatisch generieren
    const label = TYPE_LABELS[type as CareDocumentType] ?? type;
    const startFormatted = new Date(period_start).toLocaleDateString('de-DE');
    const endFormatted = new Date(period_end).toLocaleDateString('de-DE');
    const title = `${label} — ${startFormatted} bis ${endFormatted}`;

    // Dokument in care_documents speichern
    const reportJson = JSON.stringify(reportData);
    const { data: doc, error } = await supabase
      .from('care_documents')
      .insert({
        senior_id: seniorId,
        type: type as CareDocumentType,
        title,
        period_start,
        period_end,
        generated_by: user.id,
        storage_path: `reports/${seniorId}/${type}_${period_start}_${period_end}.json`,
        file_size_bytes: new TextEncoder().encode(reportJson).length,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    // Audit-Log schreiben (nicht blockierend)
    writeAuditLog(supabase, {
      seniorId,
      actorId: user.id,
      eventType: 'document_generated',
      referenceType: 'care_documents',
      referenceId: doc.id,
      metadata: { type, period_start, period_end },
    });

    return successResponse(doc, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return errorResponse(`Bericht-Generierung fehlgeschlagen: ${message}`, 500);
  }
}
