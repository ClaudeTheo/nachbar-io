// Nachbar.io — Analytics-Cron-Service
// Business-Logik fuer die taegliche KPI-Snapshot-Berechnung pro Quartier.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { calculateQuarterSnapshot, saveSnapshot } from "@/lib/analytics";

export interface AnalyticsCronResult {
  processed: number;
  success: number;
  failed: number;
  results: Array<{
    quarterId: string;
    quarterName: string;
    success: boolean;
    error?: string;
  }>;
  timestamp: string;
}

/**
 * Berechnet taegliche KPI-Snapshots fuer alle aktiven Quartiere
 * und speichert sie in der Datenbank.
 */
export async function runAnalyticsCron(
  supabase: SupabaseClient,
): Promise<AnalyticsCronResult> {
  const now = new Date();

  // Alle aktiven Quartiere laden
  const { data: quarters, error: quartersError } = await supabase
    .from("quarters")
    .select("id, name")
    .eq("status", "active");

  if (quartersError) {
    console.error(
      "[cron/analytics] Quartiere laden fehlgeschlagen:",
      quartersError,
    );
    throw new ServiceError(
      "Quartiere konnten nicht geladen werden",
      500,
      undefined,
      { details: quartersError.message },
    );
  }

  if (!quarters || quarters.length === 0) {
    console.log(
      "[cron/analytics] Keine aktiven Quartiere gefunden — nichts zu berechnen",
    );
    return {
      processed: 0,
      success: 0,
      failed: 0,
      results: [],
      timestamp: now.toISOString(),
    };
  }

  // Fuer jedes Quartier: Snapshot berechnen und speichern
  const results: AnalyticsCronResult["results"] = [];

  for (const quarter of quarters) {
    try {
      const snapshot = await calculateQuarterSnapshot(
        supabase,
        quarter.id,
        now,
      );
      await saveSnapshot(supabase, snapshot);
      results.push({
        quarterId: quarter.id,
        quarterName: quarter.name,
        success: true,
      });
      console.log(
        `[cron/analytics] Snapshot gespeichert: ${quarter.name} — WAH=${snapshot.wah}, Users=${snapshot.total_users}, Active7d=${snapshot.active_users_7d}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      results.push({
        quarterId: quarter.id,
        quarterName: quarter.name,
        success: false,
        error: message,
      });
      console.error(`[cron/analytics] Fehler bei ${quarter.name}:`, message);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(
    `[cron/analytics] Fertig: ${successCount} erfolgreich, ${failCount} fehlgeschlagen (${quarters.length} Quartiere)`,
  );

  return {
    processed: quarters.length,
    success: successCount,
    failed: failCount,
    results,
    timestamp: now.toISOString(),
  };
}
