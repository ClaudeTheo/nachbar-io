// lib/security/redis.ts
// Upstash Redis Client — Source of Truth fuer Security-State
// Fail-open: Bei Verbindungsfehler wird Score 0 zurueckgegeben (kein Nutzer ausgesperrt)
// Fail-ALERT: Bei Ausfall wird Admin benachrichtigt (nicht nur console.warn)

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let redisAvailable = true;
let lastFailAlertAt = 0;
const FAIL_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 Minuten zwischen Alerts

export function getSecurityRedis(): Redis | null {
  if (redis) return redis;

  // Vercel Marketplace setzt KV_REST_API_*, Legacy: UPSTASH_REDIS_REST_*
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[security] Upstash Redis nicht konfiguriert — Security-Scoring deaktiviert",
    );
    emitFailAlert("REDIS_NOT_CONFIGURED");
    return null;
  }

  redis = new Redis({
    url,
    token,
    automaticDeserialization: true,
    retry: {
      retries: 1,
      backoff: (retryCount) => Math.min(retryCount * 50, 200),
    },
  });
  return redis;
}

/** Prueft ob Redis erreichbar ist. Sollte beim App-Start aufgerufen werden. */
export async function checkRedisHealth(): Promise<boolean> {
  const client = getSecurityRedis();
  if (!client) return false;

  try {
    await client.ping();
    if (!redisAvailable) {
      console.info("[security] Redis wieder erreichbar");
      redisAvailable = true;
    }
    return true;
  } catch (err) {
    console.error("[security] Redis Health-Check fehlgeschlagen:", err);
    redisAvailable = false;
    emitFailAlert("REDIS_HEALTH_CHECK_FAILED");
    return false;
  }
}

/** Wird von risk-scorer.ts aufgerufen wenn Redis-Operation fehlschlaegt */
export function reportRedisFailure(operation: string, error: unknown): void {
  console.error(`[security] Redis-Fehler bei ${operation}:`, error);
  if (redisAvailable) {
    redisAvailable = false;
    emitFailAlert("REDIS_OPERATION_FAILED");
  }
}

/** Gibt aktuellen Redis-Status zurueck (fuer Dashboard/Health-Endpoint) */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/** Fail-Alert: Admin ueber Redis-Ausfall informieren (mit Cooldown) */
function emitFailAlert(reason: string): void {
  const now = Date.now();
  if (now - lastFailAlertAt < FAIL_ALERT_COOLDOWN_MS) return;
  lastFailAlertAt = now;

  // Strukturiertes Log (wird von Vercel Log Drain / Monitoring erfasst)
  console.error(
    JSON.stringify({
      level: "CRITICAL",
      component: "security-redis",
      event: "redis_unavailable",
      reason,
      timestamp: new Date().toISOString(),
      message:
        "Security-Scoring deaktiviert — System laeuft fail-open ohne Schutz",
    }),
  );

  // Async Push an Admins (fire-and-forget, darf nicht blockieren)
  notifyAdminsRedisDown(reason).catch(() => {});
}

async function notifyAdminsRedisDown(reason: string): Promise<void> {
  try {
    // Dynamischer Import um zirkulaere Abhaengigkeiten zu vermeiden
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const { data: admins } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("role", "admin");

    if (!admins?.length) return;

    const { sendPush } = await import("@/modules/care/services/channels/push");

    for (const admin of admins) {
      sendPush(supabase, {
        userId: admin.user_id,
        title: "SECURITY: Redis-Ausfall",
        body: `Security-Scoring deaktiviert (${reason}). System laeuft ohne Schutz.`,
        url: "/admin/security",
        tag: "security-redis-down",
      }).catch(() => {});
    }
  } catch {
    // Wenn auch Supabase nicht erreichbar ist, koennen wir nur loggen
    console.error(
      "[security] Konnte Admin nicht ueber Redis-Ausfall benachrichtigen",
    );
  }
}
