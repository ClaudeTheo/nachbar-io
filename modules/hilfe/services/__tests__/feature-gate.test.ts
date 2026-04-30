import { describe, it, expect } from "vitest";
import {
  canAccessBilling,
  isTrialExpired,
  getSubscriptionLabel,
} from "../feature-gate";

describe("feature-gate", () => {
  describe("canAccessBilling", () => {
    it("returns false for free status", () => {
      expect(canAccessBilling("free")).toBe(false);
    });

    it("returns true for trial (not used)", () => {
      expect(canAccessBilling("trial", false)).toBe(true);
    });

    it("returns false for trial (receipt used)", () => {
      expect(canAccessBilling("trial", true)).toBe(false);
    });

    it("returns true for active", () => {
      expect(canAccessBilling("active")).toBe(true);
    });

    it("returns false for paused", () => {
      expect(canAccessBilling("paused")).toBe(false);
    });

    it("returns false for cancelled", () => {
      expect(canAccessBilling("cancelled")).toBe(false);
    });
  });

  describe("isTrialExpired", () => {
    it("returns true when trial receipt is used", () => {
      expect(isTrialExpired("trial", true)).toBe(true);
    });

    it("returns false when trial receipt not used", () => {
      expect(isTrialExpired("trial", false)).toBe(false);
    });

    it("returns false for non-trial status", () => {
      expect(isTrialExpired("active", true)).toBe(false);
    });
  });

  describe("getSubscriptionLabel", () => {
    it("returns correct labels", () => {
      expect(getSubscriptionLabel("free")).toBe("Kostenlos");
      expect(getSubscriptionLabel("trial")).toBe("Testphase");
      expect(getSubscriptionLabel("active")).toBe(
        "Abrechnungs-Modul (19,90 EUR/Mo)",
      );
      expect(getSubscriptionLabel("paused")).toBe("Pausiert");
      expect(getSubscriptionLabel("cancelled")).toBe("Gekuendigt");
    });
  });
});
