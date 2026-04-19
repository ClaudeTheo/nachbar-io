// lib/device-pairing/__tests__/pair-code.test.ts
// Tests fuer 6-stelligen Pair-Code + Redis-Key-Helper.

import { describe, it, expect } from "vitest";
import {
  generatePairCode,
  PAIR_CODE_REDIS_TTL_SECONDS,
  pairCodeRedisKey,
} from "../pair-code";

describe("pair-code", () => {
  it("generatePairCode liefert 6-stellige numerische Strings", () => {
    for (let i = 0; i < 100; i++) {
      const code = generatePairCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("generatePairCode liefert unique Codes ueber 500 Zuege (>95%)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) codes.add(generatePairCode());
    expect(codes.size).toBeGreaterThan(475);
  });

  it("pairCodeRedisKey setzt Prefix 'pair-code:'", () => {
    expect(pairCodeRedisKey("123456")).toBe("pair-code:123456");
  });

  it("TTL ist 600 Sekunden (10 Minuten)", () => {
    expect(PAIR_CODE_REDIS_TTL_SECONDS).toBe(600);
  });
});
