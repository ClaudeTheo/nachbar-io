// modules/care/services/reports-routes.service.ts
// Nachbar.io — Berichte-Verwaltung (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { generateReportData } from "@/lib/care/reports/generator";
import { writeAuditLog } from "@/lib/care/audit";
import { requireCareAccess, requireFeature } from "@/lib/care/api-helpers";
import { careLog } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";
import type { CareDocumentType } from "@/lib/care/types";

const VALID_TYPES: CareDocumentType[] = [
  "care_report_daily",
  "care_report_weekly",
  "care_report_monthly",
  "emergency_log",
  "medication_report",
  "care_aid_application",
  "tax_summary",
  "usage_report",
];

const TYPE_LABELS: Record<CareDocumentType, string> = {
  care_report_daily: "Tagesbericht",
  care_report_weekly: "Wochenbericht",
  care_report_monthly: "Monatsbericht",
  emergency_log: "Notfall-Protokoll",
  medication_report: "Medikamenten-Bericht",
  care_aid_application: "Pflegehilfsmittel-Antrag",
  tax_summary: "Steuer-Zusammenfassung",
  usage_report: "Nutzungsbericht",
};

// --- Interfaces ---

export interface GenerateReportInput {
  type?: string;
  period_start?: string;
  period_end?: string;
  senior_id?: string;
}

export interface GetReportDataInput {
  seniorId: string;
  periodStart: string;
  periodEnd: string;
  type: string;
}

// --- Hilfsfunktion: Zugriffs- und Feature-Prüfung ---

async function checkSeniorAccessAndFeature(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string,
): Promise<void> {
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
  }
  const allowed = await requireFeature(supabase, seniorId, "reports");
  if (!allowed)
    throw new ServiceError(
      "Berichte sind in Ihrem aktuellen Plan nicht verfügbar",
      403,
    );
}

// --- Service-Funktionen ---

/**
 * Berichte auflisten (GET /api/care/reports)
 */
export async function listReports(
  supabase: SupabaseClient,
  userId: string,
  seniorId?: string | null,
): Promise<unknown[]> {
  const targetSeniorId = seniorId ?? userId;

  await checkSeniorAccessAndFeature(supabase, userId, targetSeniorId);

  careLog("reports", "list", { seniorId: targetSeniorId });

  const { data, error } = await supabase
    .from("care_documents")
    .select("*")
    .eq("senior_id", targetSeniorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new ServiceError(error.message, 500);
  return data ?? [];
}

/**
 * Bericht generieren und als Dokument speichern (POST /api/care/reports)
 */
export async function generateReport(
  supabase: SupabaseClient,
  userId: string,
  input: GenerateReportInput,
): Promise<unknown> {
  const { type, period_start, period_end } = input;
  const seniorId = input.senior_id ?? userId;

  await checkSeniorAccessAndFeature(supabase, userId, seniorId);

  // Validierung
  if (!type || !VALID_TYPES.includes(type as CareDocumentType)) {
    throw new ServiceError("Ungültiger Berichtstyp", 400);
  }
  if (!period_start || !period_end) {
    throw new ServiceError(
      "Zeitraum (period_start, period_end) erforderlich",
      400,
    );
  }

  careLog("reports", "generate", { seniorId, type, period_start, period_end });

  try {
    // Bericht-Daten generieren
    const reportData = await generateReportData(
      supabase,
      seniorId,
      period_start,
      period_end,
      type as CareDocumentType,
    );

    // Titel automatisch generieren
    const label = TYPE_LABELS[type as CareDocumentType] ?? type;
    const startFormatted = new Date(period_start).toLocaleDateString("de-DE");
    const endFormatted = new Date(period_end).toLocaleDateString("de-DE");
    const title = `${label} — ${startFormatted} bis ${endFormatted}`;

    // Dokument in care_documents speichern
    const reportJson = JSON.stringify(reportData);
    const { data: doc, error } = await supabase
      .from("care_documents")
      .insert({
        senior_id: seniorId,
        type: type as CareDocumentType,
        title,
        period_start,
        period_end,
        generated_by: userId,
        storage_path: `reports/${seniorId}/${type}_${period_start}_${period_end}.json`,
        file_size_bytes: new TextEncoder().encode(reportJson).length,
      })
      .select()
      .single();

    if (error) throw new ServiceError(error.message, 500);

    // Audit-Log schreiben (nicht blockierend)
    writeAuditLog(supabase, {
      seniorId,
      actorId: userId,
      eventType: "document_generated",
      referenceType: "care_documents",
      referenceId: doc.id,
      metadata: { type, period_start, period_end },
    });

    return doc;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    throw new ServiceError(
      `Bericht-Generierung fehlgeschlagen: ${message}`,
      500,
    );
  }
}

/**
 * Einzelnen Bericht laden (GET /api/care/reports/[id])
 */
export async function getReport(
  supabase: SupabaseClient,
  userId: string,
  reportId: string,
): Promise<unknown> {
  const { data, error } = await supabase
    .from("care_documents")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !data) throw new ServiceError("Dokument nicht gefunden", 404);

  // SICHERHEIT: Zugriffsprüfung — nur Senior, zugeordnete Helfer oder Admin
  if (data.senior_id !== userId) {
    const role = await requireCareAccess(supabase, data.senior_id);
    if (!role) throw new ServiceError("Kein Zugriff auf dieses Dokument", 403);
  }

  return data;
}

/**
 * Bericht-Daten als JSON für Client-Rendering (GET /api/care/reports/data)
 */
export async function getReportData(
  supabase: SupabaseClient,
  userId: string,
  input: GetReportDataInput,
): Promise<unknown> {
  const { seniorId, periodStart, periodEnd, type } = input;

  if (!periodStart || !periodEnd || !type) {
    throw new ServiceError(
      "Parameter period_start, period_end und type erforderlich",
      400,
    );
  }

  await checkSeniorAccessAndFeature(supabase, userId, seniorId);

  careLog("reports", "data", { seniorId, type, periodStart, periodEnd });

  try {
    const reportData = await generateReportData(
      supabase,
      seniorId,
      periodStart,
      periodEnd,
      type as CareDocumentType,
    );
    return reportData;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    throw new ServiceError(`Daten-Abfrage fehlgeschlagen: ${message}`, 500);
  }
}
