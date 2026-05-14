import { createHash, randomBytes, timingSafeEqual } from "crypto";

import type { ClaimableInvitation } from "./types";

export const SETUP_TOKEN_BYTES = 32;

export function createSetupToken(): string {
  return randomBytes(SETUP_TOKEN_BYTES).toString("base64url");
}

export function hashSetupToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function verifySetupTokenHash(rawToken: string, expectedHash: string): boolean {
  const actualHash = hashSetupToken(rawToken);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function normalizeShortCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function setupExpiresAt(hours: number, reference = new Date()): Date {
  return new Date(reference.getTime() + hours * 60 * 60 * 1000);
}

export function canClaimInvitation(
  invitation: ClaimableInvitation,
  reference = new Date(),
): boolean {
  return (
    invitation.status === "ready" &&
    invitation.used_at === null &&
    new Date(invitation.expires_at).getTime() > reference.getTime()
  );
}
