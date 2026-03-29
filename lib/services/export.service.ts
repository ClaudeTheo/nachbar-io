// Nachbar.io — Export-Service: CSV/XLSX-Datenexport fuer B2B-Organisationen
// Extrahiert aus app/api/export/route.ts [Wave 5g]

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "./service-error";
import type { ExportFormat, ExportType, ExportRow } from "@/lib/export";

const VALID_TYPES: ExportType[] = [
  "quarter_stats",
  "activity_report",
  "escalation_report",
];
const VALID_FORMATS: ExportFormat[] = ["csv", "xlsx"];
const MAX_ROWS = 10_000;

export interface ExportParams {
  type: string | null;
  format: string | null;
  quarterId: string | null;
}

export interface ExportResult {
  rows: ExportRow[];
  type: ExportType;
  format: ExportFormat;
}

/**
 * Validiert Export-Parameter, prueft Berechtigung (admin/org_admin),
 * laedt Daten aus analytics_snapshots/escalation_events,
 * anonymisiert Eskalationen und schreibt Audit-Log.
 */
export async function exportData(
  supabase: SupabaseClient,
  userId: string,
  params: ExportParams,
): Promise<ExportResult> {
  const { type, format: rawFormat, quarterId } = params;
  const format = (rawFormat ?? "csv") as ExportFormat;

  // Validierung
  if (!type || !VALID_TYPES.includes(type as ExportType)) {
    throw new ServiceError(
      `Ungültiger Typ. Erlaubt: ${VALID_TYPES.join(", ")}`,
      400,
    );
  }
  if (!VALID_FORMATS.includes(format)) {
    throw new ServiceError(
      `Ungültiges Format. Erlaubt: ${VALID_FORMATS.join(", ")}`,
      400,
    );
  }

  // Rolle pruefen: nur admin + org_admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || !["admin", "org_admin"].includes(profile.role)) {
    throw new ServiceError("Keine Berechtigung", 403);
  }

  // Daten laden
  const validType = type as ExportType;
  let rows: ExportRow[] = [];

  try {
    switch (validType) {
      case "quarter_stats": {
        let query = supabase
          .from("analytics_snapshots")
          .select(
            "snapshot_date, wah, total_users, active_users_7d, active_users_30d, new_registrations, activation_rate, retention_7d, posts_count, events_count, heartbeat_coverage, escalation_count, plus_subscribers, mrr",
          )
          .order("snapshot_date", { ascending: false })
          .limit(MAX_ROWS);

        if (quarterId) {
          query = query.eq("quarter_id", quarterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        rows = (data ?? []) as ExportRow[];
        break;
      }

      case "escalation_report": {
        let query = supabase
          .from("escalation_events")
          .select("created_at, level, status, resolved_at")
          .order("created_at", { ascending: false })
          .limit(MAX_ROWS);

        if (quarterId) {
          query = query.eq("quarter_id", quarterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        // Anonymisierung: User-ID hashen
        rows = (data ?? []).map((row: Record<string, unknown>, i: number) => ({
          ...row,
          user_id_anon: `Nutzer-${String(i + 1).padStart(3, "0")}`,
        })) as ExportRow[];
        break;
      }

      case "activity_report": {
        // Aggregierter Aktivitaetsbericht aus analytics_snapshots
        let query = supabase
          .from("analytics_snapshots")
          .select(
            "snapshot_date, posts_count, events_count, wah, active_users_7d",
          )
          .order("snapshot_date", { ascending: false })
          .limit(MAX_ROWS);

        if (quarterId) {
          query = query.eq("quarter_id", quarterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        rows = (data ?? []) as ExportRow[];
        break;
      }
    }
  } catch (err) {
    throw new ServiceError(
      `Fehler beim Laden: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  // Audit-Log-Eintrag
  await supabase
    .from("org_audit_log")
    .insert({
      user_id: userId,
      action: "export_data",
      details: {
        type: validType,
        format,
        row_count: rows.length,
        quarter_id: quarterId,
      },
    })
    .then(() => {
      /* ignoriere Fehler */
    });

  return { rows, type: validType, format };
}
