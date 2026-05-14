import { describe, expect, it } from "vitest";

import {
  canClaimInvitation,
  createShortCode,
  createSetupToken,
  hashShortCode,
  hashSetupToken,
  normalizeShortCode,
  setupExpiresAt,
  verifySetupTokenHash,
} from "@/lib/family-setup/token";

describe("family setup token primitives", () => {
  it("creates a raw token with at least 128 bits of entropy", () => {
    const token = createSetupToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes tokens stably without returning the raw token", () => {
    const raw = "family_setup_raw_token_1234567890";

    const first = hashSetupToken(raw);
    const second = hashSetupToken(raw);

    expect(first).toBe(second);
    expect(first).not.toBe(raw);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(verifySetupTokenHash(raw, first)).toBe(true);
  });

  it("normalizes short codes for manual entry", () => {
    expect(normalizeShortCode(" ab-cd 12 ")).toBe("ABCD12");
    expect(normalizeShortCode("qr 9x z")).toBe("QR9XZ");
  });

  it("creates and hashes manual short codes without ambiguous characters", () => {
    const code = createShortCode();

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(hashShortCode(` ${code.slice(0, 4)}-${code.slice(4)} `)).toBe(
      hashShortCode(code),
    );
  });

  it("calculates expiration timestamps from a reference date", () => {
    const reference = new Date("2026-05-14T10:00:00.000Z");

    expect(setupExpiresAt(24, reference).toISOString()).toBe(
      "2026-05-15T10:00:00.000Z",
    );
  });

  it("rejects expired, already claimed or non-ready invitations", () => {
    const now = new Date("2026-05-14T10:00:00.000Z");

    expect(
      canClaimInvitation({
        status: "ready",
        used_at: null,
        expires_at: "2026-05-14T10:01:00.000Z",
      }, now),
    ).toBe(true);
    expect(
      canClaimInvitation({
        status: "ready",
        used_at: null,
        expires_at: "2026-05-14T09:59:59.000Z",
      }, now),
    ).toBe(false);
    expect(
      canClaimInvitation({
        status: "ready",
        used_at: "2026-05-14T09:30:00.000Z",
        expires_at: "2026-05-14T10:01:00.000Z",
      }, now),
    ).toBe(false);
    expect(
      canClaimInvitation({
        status: "claimed",
        used_at: null,
        expires_at: "2026-05-14T10:01:00.000Z",
      }, now),
    ).toBe(false);
  });
});
