// lib/security/traps/brute-force.ts
// Wird aufgerufen wenn Rate-Limit (429) auf Auth-Routen greift
// Eskaliert Score: 1x → +10, 3x/10min → +30, 5x/10min → +50

import { getSecurityRedis } from "../redis";
import { recordEvent } from "../risk-scorer";
import { logSecurityEvent } from "../security-logger";
import type { ClientKeys } from "../client-key";

const BF_WINDOW_SECONDS = 600; // 10 Minuten
const BF_KEY_PREFIX = "sec:bf";

export async function recordAuthRateLimit(keys: ClientKeys): Promise<void> {
  const redis = getSecurityRedis();
  if (!redis) return;

  const counterKey = `${BF_KEY_PREFIX}:${keys.ipHash}`;

  try {
    const count = await redis.incr(counterKey);
    if (count === 1) {
      await redis.expire(counterKey, BF_WINDOW_SECONDS);
    }

    let points = 10;
    if (count >= 5) points = 50;
    else if (count >= 3) points = 30;

    await recordEvent(keys, "brute_force", points, ["ip"]);
    logSecurityEvent({
      keys,
      trapType: "brute_force",
      points,
      effectiveScore: points,
      stage: points >= 50 ? 3 : points >= 30 ? 2 : 1,
      routePattern: "/api/auth/*",
      metadata: { rateLimitHits: count },
    });
  } catch {
    // Fail-open
  }
}
