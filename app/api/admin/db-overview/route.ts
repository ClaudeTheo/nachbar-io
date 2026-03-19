import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

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

/**
 * GET /api/admin/db-overview
 *
 * Gibt Tabellen-Uebersicht zurueck: Name, Zeilen-Count, Kategorie.
 * Verwendet Service-Role um RLS zu umgehen.
 * Nur fuer Admins.
 */
export async function GET() {
  const supabase = await createServerClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  const adminDb = getAdminSupabase();

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

  const tables = tableResults.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return { name: "unbekannt", category: "System", rowCount: -1, error: "Abfrage fehlgeschlagen" };
  });

  // Zusammenfassung
  const validTables = tables.filter((t) => t.rowCount >= 0);
  const totalRows = validTables.reduce((sum, t) => sum + t.rowCount, 0);
  const largest = validTables.sort((a, b) => b.rowCount - a.rowCount)[0];

  return NextResponse.json({
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
  });
}
