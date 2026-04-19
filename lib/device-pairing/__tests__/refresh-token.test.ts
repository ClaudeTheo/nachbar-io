// lib/device-pairing/__tests__/refresh-token.test.ts
// Welle B Task B4 (helper): Random refresh-token + SHA-256 hash
// @vitest-environment node

import { describe, it, expect } from "vitest";
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
} from "@/lib/device-pairing/refresh-token";

describe("generateRefreshToken", () => {
  it("erzeugt 64-stelligen hex-String (32 Bytes)", () => {
    const t = generateRefreshToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("erzeugt zwei verschiedene Token bei zwei Aufrufen", () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});

describe("hashRefreshToken", () => {
  it("erzeugt deterministischen 64-stelligen SHA-256-hex", () => {
    const t = "abcdef";
    const h1 = hashRefreshToken(t);
    const h2 = hashRefreshToken(t);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
  });

  it("erzeugt verschiedene Hashes fuer verschiedene Token", () => {
    expect(hashRefreshToken("a")).not.toBe(hashRefreshToken("b"));
  });
});

describe("REFRESH_TOKEN_TTL_DAYS", () => {
  it("ist 180 Tage (6 Monate)", () => {
    expect(REFRESH_TOKEN_TTL_DAYS).toBe(180);
  });
});
