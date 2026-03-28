// __tests__/lib/youth-profile.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateAgeGroup,
  getAccessLevel,
  canAccessFeature,
} from "@/modules/youth";

describe("Youth Profile", () => {
  describe("calculateAgeGroup", () => {
    it("returns u16 for birth year that makes user 14-15", () => {
      // Aktuelles Jahr 2026, Geburtsjahr 2011 = 15 Jahre
      expect(calculateAgeGroup(2011, 2026)).toBe("u16");
      expect(calculateAgeGroup(2012, 2026)).toBe("u16");
    });

    it("returns 16_17 for birth year that makes user 16-17", () => {
      expect(calculateAgeGroup(2010, 2026)).toBe("16_17");
      expect(calculateAgeGroup(2009, 2026)).toBe("16_17");
    });

    it("returns null for too young (<14) or too old (>=18)", () => {
      expect(calculateAgeGroup(2013, 2026)).toBeNull(); // 13
      expect(calculateAgeGroup(2008, 2026)).toBeNull(); // 18
    });
  });

  describe("getAccessLevel", () => {
    it("returns basis for u16 without guardian consent", () => {
      expect(getAccessLevel("u16", false)).toBe("basis");
    });

    it("returns erweitert for 16_17 without guardian consent", () => {
      expect(getAccessLevel("16_17", false)).toBe("erweitert");
    });

    it("returns freigeschaltet for any age with guardian consent", () => {
      expect(getAccessLevel("u16", true)).toBe("freigeschaltet");
      expect(getAccessLevel("16_17", true)).toBe("freigeschaltet");
    });
  });

  describe("canAccessFeature", () => {
    it("allows basis features for all levels", () => {
      expect(canAccessFeature("basis", "view_tasks")).toBe(true);
      expect(canAccessFeature("erweitert", "view_tasks")).toBe(true);
    });

    it("blocks erweitert features for basis level", () => {
      expect(canAccessFeature("basis", "accept_task")).toBe(false);
      expect(canAccessFeature("basis", "chat")).toBe(false);
    });

    it("allows erweitert features for erweitert and above", () => {
      expect(canAccessFeature("erweitert", "accept_task")).toBe(true);
      expect(canAccessFeature("freigeschaltet", "accept_task")).toBe(true);
    });

    it("blocks freigeschaltet features for erweitert", () => {
      expect(canAccessFeature("erweitert", "certificates")).toBe(false);
    });
  });
});
