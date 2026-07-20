// lib/feature-flags-middleware-cache.ts
// Redis-gecachte Flag-Reads fuer proxy.ts (Middleware / Edge-Runtime).
// Cache-TTL 60 s: Admin-Toggle wird nach max 60 s live (akzeptabel, kein
// Echtzeit-Zwang). Fail-closed: Bei DB-Fehler wird Feature als disabled
// behandelt (sicherer Default fuer Gating).

import { getSecurityRedis } from "@/lib/security/redis";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeFeatureFlagConfig,
  resolveFeatureFlagAccess,
  type FeatureFlagGateConfig,
} from "@/lib/feature-flags-server";

const TTL_SECONDS = 60;

/**
 * Liest ein Feature-Flag mit Redis-Cache.
 * Verwendung ausschliesslich in Middleware/Edge (proxy.ts), wo pro-Request-DB
 * zu teuer ist. Andere Server-Komponenten nutzen `isFeatureEnabledServer` aus
 * `lib/feature-flags-server.ts` direkt.
 *
 * PILOT_MODE wird bewusst nicht fuer Feature-Flag-Logik genutzt.
 */
export async function getCachedFlagEnabled(flagKey: string): Promise<boolean> {
  // v2 trennt die neue Konfigurations-Form von alten gecachten Boolean-Werten.
  const cacheKey = `ff:v2:${flagKey}`;
  const redis = getSecurityRedis();
  let flag: FeatureFlagGateConfig | null = null;

  if (redis) {
    try {
      const cached = await redis.get<FeatureFlagGateConfig>(cacheKey);
      flag = normalizeFeatureFlagConfig(cached);
    } catch {
      // Cache-Fehler: weiter zum DB-Fallback
    }
  }

  try {
    const supabase = await createClient();

    if (!flag) {
      const { data } = await supabase
        .from("feature_flags")
        .select("enabled, enabled_quarters, admin_override")
        .eq("key", flagKey)
        .single();
      flag = normalizeFeatureFlagConfig(data);
      if (!flag) return false;

      if (redis) {
        try {
          await redis.set(cacheKey, flag, { ex: TTL_SECONDS });
        } catch {
          // Cache-Write-Fehler ignorieren, Antwort trotzdem zurueckgeben
        }
      }
    }

    return resolveFeatureFlagAccess(supabase, flag);
  } catch {
    // Fail-closed: DB-Fehler -> Feature als disabled behandeln
    return false;
  }
}
