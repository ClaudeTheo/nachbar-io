// lib/care/heat-warning-check.ts
// Task 12: DWD-Hitze × Heartbeat-Eskalation
//
// Prueft ob fuer ein Quartier eine aktive DWD-Hitzewarnung vorliegt.
// Wird vom Heartbeat-Eskalations-Cron verwendet, um bei Hitze die
// Eskalation von reminder_24h direkt auf alert_48h hochzustufen.

import { SupabaseClient } from "@supabase/supabase-js";
import { HEARTBEAT_ESCALATION } from "./constants";
import type { EscalationStage } from "./types";

export interface HeatWarningInfo {
  severity: string;
  headline: string;
}

/**
 * Prueft ob fuer das gegebene Quartier eine aktive DWD-Hitzewarnung
 * (severity severe oder extreme) in der external_warning_cache vorliegt.
 */
export async function checkActiveHeatWarning(
  supabase: SupabaseClient,
  quarterId: string | null,
): Promise<HeatWarningInfo | null> {
  if (!quarterId) return null;

  const { data, error } = await supabase
    .from("external_warning_cache")
    .select("id, headline, severity, event_code, expires_at")
    .eq("provider", "dwd")
    .eq("quarter_id", quarterId)
    .eq("status", "active")
    .in("severity", ["severe", "extreme"])
    .gte("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[care/heat-warning-check] DWD-Hitze-Abfrage fehlgeschlagen:",
      error,
    );
    return null;
  }

  if (!data) return null;

  // Nur Hitze-Events (nicht jede severe-DWD-Warnung loest Eskalation aus)
  const isHeat =
    data.event_code?.toUpperCase().includes("HITZE") ||
    data.headline?.toLowerCase().includes("hitze");

  if (!isHeat) return null;

  return {
    severity: data.severity,
    headline: data.headline,
  };
}

/**
 * Hitze-bewusste Eskalationsstufe: Bei aktiver Hitzewarnung wird
 * reminder_24h direkt auf alert_48h hochgestuft.
 * Unter 24h (null) wird NICHT hochgestuft — keine Fehlalarme.
 */
export function getHeatAwareEscalationStage(
  hoursAgo: number,
  heatWarning: HeatWarningInfo | null,
): EscalationStage | null {
  if (hoursAgo <= HEARTBEAT_ESCALATION.reminder_after_hours) return null;
  if (hoursAgo > HEARTBEAT_ESCALATION.alert_after_hours) return "alert_48h";

  // 24h-48h Zone: normalerweise reminder_24h
  if (heatWarning) return "alert_48h";
  return "reminder_24h";
}

/**
 * Baut den Benachrichtigungstext mit Hitze-Kontext.
 */
export function buildHeatAlertBody(
  baseBody: string,
  heatWarning: HeatWarningInfo | null,
): string {
  if (!heatWarning) return baseBody;

  const severityLabel =
    heatWarning.severity === "extreme" ? "Stufe 4" : "Stufe 3";

  return `${baseBody}\n\nHinweis: Es herrscht aktuell eine Hitzewarnung (${severityLabel}) in Ihrem Quartier. Bei Hitze sind ältere Menschen besonders gefährdet.`;
}
