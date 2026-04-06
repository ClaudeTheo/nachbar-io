// lib/security/redis.ts
// Upstash Redis Client — Source of Truth fuer Security-State
// Fail-open: Bei Verbindungsfehler wird Score 0 zurueckgegeben (kein Nutzer ausgesperrt)

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getSecurityRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[security] Upstash Redis nicht konfiguriert — Security-Scoring deaktiviert");
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}
