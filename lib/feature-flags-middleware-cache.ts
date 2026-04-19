// lib/feature-flags-middleware-cache.ts
// Redis-gecachte Flag-Reads fuer proxy.ts (Middleware / Edge-Runtime).
// Cache-TTL 60 s: Admin-Toggle wird nach max 60 s live (akzeptabel, kein
// Echtzeit-Zwang). Fail-closed: Bei DB-Fehler wird Feature als disabled
// behandelt (sicherer Default fuer Gating).

import { getSecurityRedis } from "@/lib/security/redis";
import { createClient } from "@/lib/supabase/server";

const TTL_SECONDS = 60;

/**
 * Liest ein Feature-Flag mit Redis-Cache.
 * Verwendung ausschliesslich in Middleware/Edge (proxy.ts), wo pro-Request-DB
 * zu teuer ist. Andere Server-Komponenten nutzen `isFeatureEnabledServer` aus
 * `lib/feature-flags-server.ts` direkt.
 *
 * PILOT_MODE-Bypass: Wenn NEXT_PUBLIC_PILOT_MODE=true, immer true zurueckgeben
 * (gleiche Semantik wie Client- und Server-Evaluator).
 */
export async function getCachedFlagEnabled(flagKey: string): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_PILOT_MODE === "true") return true;

  const cacheKey = `ff:${flagKey}`;
  const redis = getSecurityRedis();

  if (redis) {
    try {
      const cached = await redis.get<string | number>(cacheKey);
      if (cached === "1" || cached === 1) return true;
      if (cached === "0" || cached === 0) return false;
    } catch {
      // Cache-Fehler: weiter zum DB-Fallback
    }
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", flagKey)
      .single();
    const enabled = data?.enabled === true;

    if (redis) {
      try {
        await redis.set(cacheKey, enabled ? "1" : "0", { ex: TTL_SECONDS });
      } catch {
        // Cache-Write-Fehler ignorieren, Antwort trotzdem zurueckgeben
      }
    }

    return enabled;
  } catch {
    // Fail-closed: DB-Fehler -> Feature als disabled behandeln
    return false;
  }
}
