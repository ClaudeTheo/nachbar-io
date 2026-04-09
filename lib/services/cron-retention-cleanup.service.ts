// Nachbar.io — Retention Cleanup Service (DSGVO Loeschkonzept)
// Loescht Daten die ihre Aufbewahrungsfrist ueberschritten haben
// Aufgerufen via /api/cron/retention-cleanup (woechentlich)

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RetentionResult {
  success: true;
  timestamp: string;
  deleted: {
    checkins: number;
    messages: number;
    news_summaries: number;
  };
}

// Retention-Fristen laut VVT + Loeschkonzept
const RETENTION = {
  checkins_days: 90, // V02: Check-in 90 Tage
  messages_days: 365, // V04: Nachrichten 1 Jahr
  news_summaries_days: 7, // V05: KI-Zusammenfassungen 7 Tage
} as const;

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function runRetentionCleanup(
  supabase: SupabaseClient,
): Promise<RetentionResult> {
  // 1. Check-ins aelter als 90 Tage
  const { count: checkinsDeleted } = await supabase
    .from("checkins")
    .delete({ count: "exact" })
    .lt("created_at", daysAgo(RETENTION.checkins_days));

  // 2. Nachrichten aelter als 365 Tage
  const { count: messagesDeleted } = await supabase
    .from("messages")
    .delete({ count: "exact" })
    .lt("created_at", daysAgo(RETENTION.messages_days));

  // 3. KI-News-Summaries aelter als 7 Tage
  const { count: newsDeleted } = await supabase
    .from("news_summaries")
    .delete({ count: "exact" })
    .lt("created_at", daysAgo(RETENTION.news_summaries_days));

  // Audit-Log: Retention-Lauf dokumentieren
  const deleted = {
    checkins: checkinsDeleted ?? 0,
    messages: messagesDeleted ?? 0,
    news_summaries: newsDeleted ?? 0,
  };

  await supabase.from("org_audit_log").insert({
    action: "retention_cleanup",
    details: { ...deleted, retention_config: RETENTION },
  });

  return {
    success: true,
    timestamp: new Date().toISOString(),
    deleted,
  };
}
