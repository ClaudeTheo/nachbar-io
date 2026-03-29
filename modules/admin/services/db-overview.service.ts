// Nachbar.io — Service: Admin Datenbank-Uebersicht
// Extrahiert aus app/api/admin/db-overview/route.ts

import { SupabaseClient } from "@supabase/supabase-js";

// Alle Tabellen mit Kategorien
const DB_TABLES = [
  // Core
  { name: "users", category: "Core" },
  { name: "households", category: "Core" },
  { name: "household_members", category: "Core" },
  { name: "verification_requests", category: "Core" },
  { name: "quarters", category: "Core" },
  // Content
  { name: "alerts", category: "Content" },
  { name: "alert_responses", category: "Content" },
  { name: "help_requests", category: "Content" },
  { name: "help_responses", category: "Content" },
  { name: "marketplace_items", category: "Content" },
  { name: "lost_found", category: "Content" },
  { name: "events", category: "Content" },
  { name: "event_participants", category: "Content" },
  { name: "news_items", category: "Content" },
  { name: "community_tips", category: "Content" },
  // Social
  { name: "conversations", category: "Social" },
  { name: "direct_messages", category: "Social" },
  { name: "neighbor_connections", category: "Social" },
  { name: "neighbor_invitations", category: "Social" },
  { name: "skills", category: "Social" },
  { name: "reputation_points", category: "Social" },
  { name: "polls", category: "Social" },
  { name: "poll_options", category: "Social" },
  { name: "poll_votes", category: "Social" },
  // Features
  { name: "leihboerse_items", category: "Features" },
  { name: "paketannahme", category: "Features" },
  { name: "vacation_modes", category: "Features" },
  { name: "noise_warnings", category: "Features" },
  { name: "whohas_items", category: "Features" },
  { name: "map_houses", category: "Features" },
  // System
  { name: "notifications", category: "System" },
  { name: "push_subscriptions", category: "System" },
  { name: "device_tokens", category: "System" },
  // Care
  { name: "care_profiles", category: "Care" },
  { name: "care_sos_alerts", category: "Care" },
  { name: "care_sos_responses", category: "Care" },
  { name: "care_checkins", category: "Care" },
  { name: "care_medications", category: "Care" },
  { name: "care_medication_logs", category: "Care" },
  { name: "care_appointments", category: "Care" },
  { name: "care_helpers", category: "Care" },
  { name: "care_audit_log", category: "Care" },
  { name: "care_documents", category: "Care" },
  { name: "care_subscriptions", category: "Care" },
];

export interface TableInfo {
  name: string;
  category: string;
  rowCount: number;
  error?: string;
}

export interface DbOverviewResult {
  tables: TableInfo[];
  summary: {
    totalTables: number;
    activeTables: number;
    missingTables: number;
    totalRows: number;
    largestTable: { name: string; rows: number } | null;
  };
  supabaseEditorUrl: string;
  timestamp: string;
}

/**
 * Fragt alle Tabellen parallel ab und berechnet eine Zusammenfassung.
 * Verwendet adminDb (Service-Role) um RLS zu umgehen.
 */
export async function getDbOverview(adminDb: SupabaseClient): Promise<DbOverviewResult> {
  // Parallel alle Tabellen abfragen
  const tableResults = await Promise.allSettled(
    DB_TABLES.map(async (table) => {
      try {
        // Zeilen zaehlen
        const { count, error: countError } = await adminDb
          .from(table.name)
          .select("*", { count: "exact", head: true });

        if (countError) {
          return {
            name: table.name,
            category: table.category,
            rowCount: -1,
            error: countError.message,
          };
        }

        return {
          name: table.name,
          category: table.category,
          rowCount: count ?? 0,
        };
      } catch {
        return {
          name: table.name,
          category: table.category,
          rowCount: -1,
          error: "Tabelle nicht gefunden",
        };
      }
    })
  );

  const tables: TableInfo[] = tableResults.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return { name: "unbekannt", category: "System", rowCount: -1, error: "Abfrage fehlgeschlagen" };
  });

  // Zusammenfassung
  const validTables = tables.filter((t) => t.rowCount >= 0);
  const totalRows = validTables.reduce((sum, t) => sum + t.rowCount, 0);
  const largest = [...validTables].sort((a, b) => b.rowCount - a.rowCount)[0];

  return {
    tables,
    summary: {
      totalTables: tables.length,
      activeTables: validTables.length,
      missingTables: tables.length - validTables.length,
      totalRows,
      largestTable: largest ? { name: largest.name, rows: largest.rowCount } : null,
    },
    supabaseEditorUrl: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/editor",
    timestamp: new Date().toISOString(),
  };
}
