// Nachbar.io — Service: Admin Migration-Status pruefen
// Extrahiert aus app/api/admin/migration-status/route.ts

import { SupabaseClient } from "@supabase/supabase-js";

// Notification-Typen die in Migration 037 hinzugefuegt werden
const NEW_TYPES = [
  "broadcast",
  "help_response",
  "event_participation",
  "expert_review",
  "expert_endorsement",
  "connection_accepted",
  "poll_vote",
  "tip_confirmation",
  "message",
  "leihboerse",
  "verification_approved",
  "verification_rejected",
];

// SQL fuer Migration 037
const MIGRATION_SQL = `-- Migration 037: Notification Types erweitern
-- Kopieren Sie dieses SQL in den Supabase SQL Editor und fuehren Sie es aus.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'alert', 'alert_response', 'help_match', 'marketplace',
  'lost_found', 'news', 'checkin_reminder', 'system',
  'care_sos', 'care_sos_response', 'care_checkin_reminder',
  'care_checkin_missed', 'care_medication_reminder',
  'care_medication_missed', 'care_appointment_reminder',
  'care_escalation', 'care_helper_verified',
  'broadcast', 'help_response', 'event_participation',
  'expert_review', 'expert_endorsement', 'connection_accepted',
  'poll_vote', 'tip_confirmation', 'message',
  'leihboerse', 'verification_approved', 'verification_rejected'
));`;

export interface MigrationTypeResult {
  type: string;
  status: "ok" | "blocked";
}

export interface MigrationStatusResult {
  migrationApplied: boolean;
  migration: string;
  summary: string;
  types: MigrationTypeResult[];
  sqlEditorUrl: string;
  migrationSql: string;
}

/**
 * Prueft ob Migration 037 (Notification Types) angewendet wurde.
 * Versucht fuer jeden neuen Typ eine Dummy-Zeile einzufuegen und
 * rollt sie sofort zurueck (DELETE). Bei Constraint-Fehler ist der
 * Typ noch nicht freigeschaltet.
 */
export async function checkMigrationStatus(
  adminSupabase: SupabaseClient,
  testUserId: string
): Promise<MigrationStatusResult> {
  // Test-Notification fuer jeden neuen Typ einfuegen
  const results: MigrationTypeResult[] = [];

  for (const type of NEW_TYPES) {
    const { data: inserted, error: insertError } = await adminSupabase
      .from("notifications")
      .insert({
        user_id: testUserId,
        type,
        title: `__migration_test_${type}`,
        body: "Test-Zeile — wird sofort geloescht",
      })
      .select("id")
      .single();

    if (insertError) {
      results.push({ type, status: "blocked" });
    } else if (inserted) {
      // Test-Zeile sofort loeschen
      await adminSupabase
        .from("notifications")
        .delete()
        .eq("id", inserted.id);
      results.push({ type, status: "ok" });
    }
  }

  const blockedCount = results.filter((r) => r.status === "blocked").length;
  const migrationApplied = blockedCount === 0;

  return {
    migrationApplied,
    migration: "037_fix_notification_types_and_cron",
    summary: migrationApplied
      ? "Alle Notification-Typen sind freigeschaltet."
      : `${blockedCount} von ${NEW_TYPES.length} Typen sind noch blockiert. Migration 037 muss ausgefuehrt werden.`,
    types: results,
    sqlEditorUrl: `https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/sql/new`,
    migrationSql: MIGRATION_SQL,
  };
}
