// lib/security/security-logger.ts
// Async Supabase-Event-Writer (fire-and-forget)
// Nutzt Admin-Client (service_role) weil kein INSERT-Policy auf security_events

import { getAdminSupabase } from "@/lib/supabase/admin";
import { determineSeverity, type TrapType, type Severity } from "./config";
import type { ClientKeys } from "./client-key";

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

async function writeEvent(event: SecurityEvent, severity: Severity): Promise<void> {
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

  // Admin-Alarm bei High/Critical
  if (severity === "high" || severity === "critical") {
    await notifyAdmin(event, severity);
  }
}

async function notifyAdmin(event: SecurityEvent, severity: Severity): Promise<void> {
  try {
    const supabase = getAdminSupabase();

    // Alle org_admins laden
    const { data: admins } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("role", "admin");

    if (!admins?.length) return;

    // Push an jeden Admin (nur importieren wenn noetig)
    const { sendPush } = await import("@/modules/care/services/channels/push");

    const title = severity === "critical"
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
