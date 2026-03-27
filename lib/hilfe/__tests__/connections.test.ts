import { describe, it, expect } from "vitest";
import { generateInviteCode, isValidInviteCode } from "../connections";

describe("connections", () => {
  describe("generateInviteCode", () => {
    it("returns 6-character alphanumeric code", () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it("generates unique codes", () => {
      const codes = new Set(
        Array.from({ length: 100 }, () => generateInviteCode()),
      );
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe("isValidInviteCode", () => {
    it("accepts valid 6-char codes", () => {
      expect(isValidInviteCode("ABC123")).toBe(true);
      expect(isValidInviteCode("ZZZZZZ")).toBe(true);
    });

    it("rejects invalid codes", () => {
      expect(isValidInviteCode("")).toBe(false);
      expect(isValidInviteCode("abc")).toBe(false);
      expect(isValidInviteCode("ABC12")).toBe(false);
      expect(isValidInviteCode("abc123")).toBe(false);
      expect(isValidInviteCode("ABC-123")).toBe(false);
    });
  });
});
