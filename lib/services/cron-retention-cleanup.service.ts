// Nachbar.io — Retention Cleanup Service (DSGVO Art. 5 Abs. 1 lit. e Speicherbegrenzung)
// Loescht Daten, die ihre Aufbewahrungsfrist ueberschritten haben.
// Aufgerufen via /api/cron/retention-cleanup (woechentlich).
//
// FIX Pre-Pilot-Audit B7: Der frühere Code löschte aus `checkins`, `messages` und
// `news_summaries` — keine dieser Tabellen existiert in Prod, der Cron lief faktisch
// ins Leere und Care-/Art.9-Daten hatten gar keine Frist. Jetzt: reale Tabellennamen
// inkl. care_checkins/heartbeats/care_sos_alerts; Protokoll in data_retention_log.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RetentionResult {
  success: true;
  timestamp: string;
  deleted: {
    care_checkins: number;
    senior_checkins: number;
    heartbeats: number;
    care_sos_alerts: number;
    direct_messages: number;
  };
}

// Retention-Fristen laut VVT + Loeschkonzept
const RETENTION_DAYS = {
  care_checkins: 90, // V02: Tagescheck (Art. 9) 90 Tage
  senior_checkins: 90, // Aktivitäts-Tagescheck 90 Tage
  heartbeats: 90, // Lebenszeichen 90 Tage
  care_sos_alerts: 90, // erledigte Notfall-Alarme 90 Tage
  direct_messages: 365, // V04: Nachrichten 1 Jahr
} as const;

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function runRetentionCleanup(
  supabase: SupabaseClient,
): Promise<RetentionResult> {
  async function purge(table: string, days: number): Promise<number> {
    const { count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .lt("created_at", daysAgo(days));
    return count ?? 0;
  }

  const deleted = {
    care_checkins: await purge("care_checkins", RETENTION_DAYS.care_checkins),
    senior_checkins: await purge("senior_checkins", RETENTION_DAYS.senior_checkins),
    heartbeats: await purge("heartbeats", RETENTION_DAYS.heartbeats),
    care_sos_alerts: await purge("care_sos_alerts", RETENTION_DAYS.care_sos_alerts),
    direct_messages: await purge("direct_messages", RETENTION_DAYS.direct_messages),
  };

  // Protokoll in der dedizierten data_retention_log-Tabelle
  try {
    await supabase.from("data_retention_log").insert({
      heartbeats_deleted: deleted.heartbeats,
      checkins_deleted: deleted.care_checkins + deleted.senior_checkins,
      sos_alerts_deleted: deleted.care_sos_alerts,
      details: { ...deleted, retention_days: RETENTION_DAYS },
    });
  } catch (logError) {
    console.warn("Retention-Protokoll konnte nicht geschrieben werden:", logError);
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    deleted,
  };
}
