// Nachbar.io — Heartbeat-Cleanup-Cron-Service
// Business-Logik fuer das Loeschen von Heartbeats aelter als 90 Tage (Retention).

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { HEARTBEAT_RETENTION_DAYS } from "@/lib/care/constants";

export interface HeartbeatCleanupResult {
  deleted: number;
  cutoff: string;
  retentionDays: number;
  timestamp: string;
}

/**
 * Loescht alle Heartbeats aelter als HEARTBEAT_RETENTION_DAYS (90 Tage).
 */
export async function runHeartbeatCleanup(
  supabase: SupabaseClient,
): Promise<HeartbeatCleanupResult> {
  const now = new Date();

  // Cutoff-Datum berechnen: jetzt - HEARTBEAT_RETENTION_DAYS (90 Tage)
  const cutoff = new Date(
    now.getTime() - HEARTBEAT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const cutoffISO = cutoff.toISOString();

  // Alle Heartbeats aelter als Cutoff-Datum loeschen
  const { data, error } = await supabase
    .from("heartbeats")
    .delete()
    .lt("created_at", cutoffISO)
    .select("id");

  if (error) {
    console.error("[cron/heartbeat-cleanup] Loeschen fehlgeschlagen:", error);
    throw new ServiceError("Heartbeat-Cleanup fehlgeschlagen", 500, undefined, {
      details: error.message,
    });
  }

  const deletedCount = data?.length ?? 0;

  console.log(
    `[cron/heartbeat-cleanup] ${deletedCount} Heartbeats geloescht (aelter als ${HEARTBEAT_RETENTION_DAYS} Tage, cutoff: ${cutoffISO})`,
  );

  return {
    deleted: deletedCount,
    cutoff: cutoffISO,
    retentionDays: HEARTBEAT_RETENTION_DAYS,
    timestamp: now.toISOString(),
  };
}
