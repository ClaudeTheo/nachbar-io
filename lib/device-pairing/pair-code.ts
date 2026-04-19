// lib/device-pairing/pair-code.ts
// 6-stelliger numerischer Pair-Code fuer Device-Pairing via Code-Eingabe.
// Redis-Only persistiert (kein DB-Schema). TTL 10 Minuten, single-use.

import { randomInt } from "node:crypto";

export const PAIR_CODE_REDIS_TTL_SECONDS = 600; // 10 Minuten

/** Erzeugt einen kryptografisch sicheren 6-stelligen numerischen Code. */
export function generatePairCode(): string {
  // crypto.randomInt ist gleichverteilt, keine Modulo-Bias.
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function pairCodeRedisKey(code: string): string {
  return `pair-code:${code}`;
}

export type PairCodePayload = {
  senior_user_id: string;
  caregiver_id: string;
  created_at: string;
};
