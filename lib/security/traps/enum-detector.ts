// lib/security/traps/enum-detector.ts
// Zaehlt Geo-Abfragen pro IP/Session und eskaliert bei Schwellwert-Ueberschreitung
// Aufruf: In /api/geo/by-street Route

import { getSecurityRedis } from "../redis";
import { recordEvent } from "../risk-scorer";
import { logSecurityEvent } from "../security-logger";
import type { ClientKeys } from "../client-key";

const ENUM_WINDOW_SECONDS = 300; // 5 Minuten
const ENUM_KEY_PREFIX = "sec:enum";

export async function checkEnumeration(
  keys: ClientKeys,
  routePattern: string,
): Promise<{ blocked: boolean; count: number }> {
  const redis = getSecurityRedis();
  if (!redis) return { blocked: false, count: 0 };

  const counterKey = `${ENUM_KEY_PREFIX}:${keys.ipHash}`;

  try {
    const count = await redis.incr(counterKey);
    if (count === 1) {
      await redis.expire(counterKey, ENUM_WINDOW_SECONDS);
    }

    let points = 0;
    if (count > 20) points = 50;
    else if (count > 10) points = 30;
    else if (count > 5) points = 15;

    if (points > 0) {
      const dims: ("ip" | "user" | "session")[] = keys.userId
        ? ["ip", "user", "session"]
        : ["ip", "session"];
      await recordEvent(keys, "enumeration", points, dims);
      logSecurityEvent({
        keys,
        trapType: "enumeration",
        points,
        effectiveScore: points,
        stage: points >= 50 ? 3 : points >= 30 ? 2 : 1,
        routePattern,
        metadata: { count },
      });
    }

    return { blocked: count > 20, count };
  } catch {
    return { blocked: false, count: 0 };
  }
}
