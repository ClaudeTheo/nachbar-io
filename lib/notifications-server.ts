// lib/notifications-server.ts
// Server-seitiger Notification-Helper mit Constraint-Fallback
// Faengt CHECK-Constraint-Fehler ab und faellt auf 'system'-Typ zurueck

import type { SupabaseClient } from "@supabase/supabase-js";

interface NotificationInsert {
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  read?: boolean;
}

interface InsertResult {
  success: boolean;
  usedFallback: boolean;
  error?: string;
}

// Alle Typen die in der neuesten Migration (037) definiert sind
const VALID_NOTIFICATION_TYPES = new Set([
  "alert", "alert_response", "help_match", "marketplace",
  "lost_found", "news", "checkin_reminder", "system",
  "care_sos", "care_sos_response", "care_checkin_reminder",
  "care_checkin_missed", "care_medication_reminder",
  "care_medication_missed", "care_appointment_reminder",
  "care_escalation", "care_helper_verified",
  "broadcast", "help_response", "event_participation",
  "expert_review", "expert_endorsement", "connection_accepted",
  "poll_vote", "tip_confirmation", "message",
  "leihboerse", "verification_approved", "verification_rejected",
]);

/**
 * Fuegt eine Notification sicher ein.
 * Bei CHECK-Constraint-Fehler (23514) wird automatisch 'system' als Typ
 * verwendet und der Original-Typ im Body vermerkt.
 */
export async function safeInsertNotification(
  supabase: SupabaseClient,
  notification: NotificationInsert
): Promise<InsertResult> {
  // Erster Versuch: mit originalem Typ
  const { error } = await supabase.from("notifications").insert(notification);

  if (!error) {
    return { success: true, usedFallback: false };
  }

  // CHECK-Constraint-Fehler (PostgreSQL Error Code 23514)
  if (error.code === "23514" || error.message?.includes("notifications_type_check")) {
    console.warn(
      `[notifications] Typ '${notification.type}' wird vom DB-Constraint blockiert. ` +
      `Fallback auf 'system'. Migration 037 muss ausgefuehrt werden!`
    );

    // Zweiter Versuch: mit 'system'-Typ
    const fallbackNotification = {
      ...notification,
      type: "system",
      body: notification.body
        ? `[${notification.type}] ${notification.body}`
        : `[${notification.type}]`,
    };

    const { error: fallbackError } = await supabase
      .from("notifications")
      .insert(fallbackNotification);

    if (!fallbackError) {
      return { success: true, usedFallback: true };
    }

    return {
      success: false,
      usedFallback: true,
      error: fallbackError.message,
    };
  }

  return { success: false, usedFallback: false, error: error.message };
}

/**
 * Fuegt mehrere Notifications sicher ein (Batch).
 * Versucht zuerst den Batch-Insert, bei Constraint-Fehler einzeln mit Fallback.
 */
export async function safeInsertNotifications(
  supabase: SupabaseClient,
  notifications: NotificationInsert[]
): Promise<{ inserted: number; fallbacks: number; failed: number }> {
  if (notifications.length === 0) {
    return { inserted: 0, fallbacks: 0, failed: 0 };
  }

  // Erster Versuch: Batch-Insert
  const { error } = await supabase.from("notifications").insert(notifications);

  if (!error) {
    return { inserted: notifications.length, fallbacks: 0, failed: 0 };
  }

  // Bei Constraint-Fehler: einzeln mit Fallback
  if (error.code === "23514" || error.message?.includes("notifications_type_check")) {
    console.warn(
      `[notifications] Batch-Insert blockiert. Versuche einzeln mit Fallback. ` +
      `Migration 037 muss ausgefuehrt werden!`
    );

    let inserted = 0;
    let fallbacks = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await safeInsertNotification(supabase, notification);
      if (result.success) {
        inserted++;
        if (result.usedFallback) fallbacks++;
      } else {
        failed++;
      }
    }

    return { inserted, fallbacks, failed };
  }

  return { inserted: 0, fallbacks: 0, failed: notifications.length };
}

/**
 * Prueft ob ein Notification-Typ vom aktuellen DB-Constraint unterstuetzt wird.
 * Nützlich fuer die Admin-Anzeige des Migrationsstatus.
 */
export function isKnownNotificationType(type: string): boolean {
  return VALID_NOTIFICATION_TYPES.has(type);
}
