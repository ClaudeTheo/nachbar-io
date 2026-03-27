// lib/quarter/resident-hash.ts
// Nachbar.io — Gemeinsames Hash-Modul fuer anonymisierte Bewohner-/Haushalt-IDs
// Verwendet HMAC-SHA256, nicht umkehrbar ohne Secret

import { createHmac } from "crypto";

const DEV_FALLBACK = "nachbar-io-dev-resident-hash-2026";

function getSecret(): string {
  const secret = process.env.RESIDENT_HASH_SECRET;
  if (!secret && process.env.NODE_ENV === "production" && typeof window === "undefined") {
    // Erlaube Build-Phase (next build collectPageData) ohne Secret
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return DEV_FALLBACK;
    }
    throw new Error("RESIDENT_HASH_SECRET environment variable is required in production");
  }
  return secret || DEV_FALLBACK;
}

// Erzeugt eine anonyme ID aus einer echten User-ID (nicht umkehrbar ohne Secret)
export function hashUserId(userId: string): string {
  return createHmac("sha256", getSecret()).update(userId).digest("hex").slice(0, 16);
}

// Erzeugt eine anonyme ID aus einer Household-ID
export function hashHouseholdId(householdId: string): string {
  return createHmac("sha256", getSecret())
    .update(`hh:${householdId}`)
    .digest("hex")
    .slice(0, 16);
}
