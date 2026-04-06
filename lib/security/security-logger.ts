// lib/security/security-logger.ts
// Async Supabase-Event-Writer (fire-and-forget)
// Nutzt Admin-Client (service_role) weil kein INSERT-Policy auf security_events
// Admin-Alert-Rate-Limiting: Max 1 Push pro Severity pro 5 Minuten

import { getAdminSupabase } from "@/lib/supabase/admin";
import { determineSeverity, type TrapType, type Severity } from "./config";
import type { ClientKeys } from "./client-key";

// Alert-Cooldown: Verhindert Notification-Spam bei Angriffen
const alertCooldowns = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 Minuten

export interface SecurityEvent {
  keys: ClientKeys;
  trapType: TrapType;
  points: number;
  effectiveScore: number;
  stage: number;
  routePattern?: string;
  metadata?: Record<string, unknown>;
}

/** Schreibt Security-Event in Supabase (fire-and-forget, blockiert nicht) */
export function logSecurityEvent(event: SecurityEvent): void {
  const severity = determineSeverity(event.trapType, event.points);

  // Fire-and-forget: Promise wird nicht awaited
  writeEvent(event, severity).catch((err) =>
    console.error("[security] Audit-Log fehlgeschlagen:", err),
  );
}

async function writeEvent(
  event: SecurityEvent,
  severity: Severity,
): Promise<void> {
  const supabase = getAdminSupabase();

  await supabase.from("security_events").insert({
    ip_hash: event.keys.ipHash,
    user_id: event.keys.userId,
    session_hash: event.keys.sessionHash,
    trap_type: event.trapType,
    severity,
    points: event.points,
    effective_score: event.effectiveScore,
    stage: event.stage,
    route_pattern: event.routePattern,
    metadata: event.metadata ?? {},
  });

  // Admin-Alarm bei High/Critical — MIT Cooldown
  if (severity === "high" || severity === "critical") {
    if (shouldAlert(severity)) {
      await notifyAdmin(event, severity);
    }
  }
}

/** Prueft ob ein Alert fuer diese Severity gesendet werden darf (Cooldown) */
function shouldAlert(severity: string): boolean {
  const now = Date.now();
  const lastAlert = alertCooldowns.get(severity) ?? 0;

  if (now - lastAlert < ALERT_COOLDOWN_MS) {
    return false; // Noch im Cooldown
  }

  alertCooldowns.set(severity, now);
  return true;
}

async function notifyAdmin(
  event: SecurityEvent,
  severity: Severity,
): Promise<void> {
  try {
    const supabase = getAdminSupabase();

    const { data: admins } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("role", "admin");

    if (!admins?.length) return;

    const { sendPush } = await import("@/modules/care/services/channels/push");

    const title =
      severity === "critical"
        ? "SECURITY ALERT: Aktiver Angriff erkannt"
        : "Security: Verdaechtiges Verhalten";

    const body = `Trap: ${event.trapType}, Score: ${event.effectiveScore}, Stufe: ${event.stage}`;

    for (const admin of admins) {
      sendPush(supabase, {
        userId: admin.user_id,
        title,
        body,
        url: "/admin/security",
        tag: `security-${severity}`,
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[security] Admin-Benachrichtigung fehlgeschlagen:", err);
  }
}
