// lib/quarter/resident-hash.ts
// Nachbar.io — Gemeinsames Hash-Modul fuer anonymisierte Bewohner-/Haushalt-IDs
// Verwendet HMAC-SHA256, nicht umkehrbar ohne Secret

import { createHmac } from "crypto";

const HASH_SECRET = process.env.RESIDENT_HASH_SECRET;

if (!HASH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("RESIDENT_HASH_SECRET environment variable is required in production");
}

const SECRET = HASH_SECRET || "nachbar-io-dev-resident-hash-2026";

// Erzeugt eine anonyme ID aus einer echten User-ID (nicht umkehrbar ohne Secret)
export function hashUserId(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 16);
}

// Erzeugt eine anonyme ID aus einer Household-ID
export function hashHouseholdId(householdId: string): string {
  return createHmac("sha256", SECRET)
    .update(`hh:${householdId}`)
    .digest("hex")
    .slice(0, 16);
}
