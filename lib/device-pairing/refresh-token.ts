// lib/device-pairing/refresh-token.ts
// Welle B Task B4 (helper): Long-Lived Refresh-Token fuer Senior-Geraete
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Token: 32 Bytes random hex (64 chars). Klartext nur einmal an Senior-Geraet,
// Server speichert nur SHA-256-hash in device_refresh_tokens.token_hash.

import { randomBytes, createHash } from "crypto";

export const REFRESH_TOKEN_TTL_DAYS = 180; // 6 Monate
export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}
