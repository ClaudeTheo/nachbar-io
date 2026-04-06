// lib/security/traps/idor-detector.ts
// Zaehlt 403/404-Responses auf parametrisierte Routen pro IP
// Aufruf: Nach 403/404 Response in API-Handlern

import { getSecurityRedis } from "../redis";
import { recordEvent } from "../risk-scorer";
import { logSecurityEvent } from "../security-logger";
import type { ClientKeys } from "../client-key";

const IDOR_WINDOW_SECONDS = 120; // 2 Minuten
const IDOR_THRESHOLD = 3;
const IDOR_KEY_PREFIX = "sec:idor";

export async function recordIdorAttempt(
  keys: ClientKeys,
  routePattern: string,
): Promise<void> {
  const redis = getSecurityRedis();
  if (!redis) return;

  const counterKey = `${IDOR_KEY_PREFIX}:${keys.ipHash}`;

  try {
    const count = await redis.incr(counterKey);
    if (count === 1) {
      await redis.expire(counterKey, IDOR_WINDOW_SECONDS);
    }

    if (count > IDOR_THRESHOLD) {
      const points = 25;
      const dims: ("ip" | "user" | "session")[] = keys.userId
        ? ["ip", "user", "session"]
        : ["ip", "session"];
      await recordEvent(keys, "idor", points, dims);
      logSecurityEvent({
        keys,
        trapType: "idor",
        points,
        effectiveScore: points * (count - IDOR_THRESHOLD),
        stage: 2,
        routePattern,
        metadata: { attempts: count },
      });
    }
  } catch {
    // Fail-open
  }
}
