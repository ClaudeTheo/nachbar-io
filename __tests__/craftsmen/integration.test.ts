import { describe, it, expect } from "vitest";
import {
  calculateTrustScore,
  formatTrustDisplay,
  type TrustScoreInput,
} from "@/lib/craftsmen/trust-score";
import { validateSubcategories } from "@/lib/craftsmen/hooks";
import { CRAFTSMAN_SUBCATEGORIES, TRUST_SCORE_CONFIG } from "@/lib/constants";

describe("Handwerker-Portal Integration", () => {
  describe("Trust-Score End-to-End Pipeline", () => {
    it("berechnet Score und formatiert Display korrekt (positiv)", () => {
      const input: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: true },
          { recommends: true, confirmed_usage: true },
          { recommends: true, confirmed_usage: false },
          { recommends: true, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
        ],
        usageEvents: [
          { user_id: "u1", used_at: "2026-03-01T10:00:00Z" },
          { user_id: "u2", used_at: "2026-03-10T10:00:00Z" },
        ],
      };

      const score = calculateTrustScore(input);
      expect(score.has_minimum).toBe(true);
      expect(score.total_recommendations).toBe(5);
      expect(score.positive_recommendations).toBe(4);
      expect(score.total_usage_events).toBe(2);
      expect(score.unique_users_count).toBe(2);
      expect(score.last_used_at).toBe("2026-03-10T10:00:00Z");

      const display = formatTrustDisplay(score);
      expect(display.variant).toBe("positive");
      expect(display.label).toContain("von 10 Nachbarn empfehlen");
    });

    it("berechnet Score und formatiert Display korrekt (neutral)", () => {
      const input: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: false },
          { recommends: true, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
        ],
        usageEvents: [],
      };

      const score = calculateTrustScore(input);
      const display = formatTrustDisplay(score);
      expect(display.variant).toBe("neutral");
    });

    it("berechnet Score und formatiert Display korrekt (low)", () => {
      const input: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
        ],
        usageEvents: [],
      };

      const score = calculateTrustScore(input);
      const display = formatTrustDisplay(score);
      expect(display.variant).toBe("low");
    });

    it("berechnet Score und formatiert Display korrekt (muted/under minimum)", () => {
      const input: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: false },
        ],
        usageEvents: [],
      };

      const score = calculateTrustScore(input);
      const display = formatTrustDisplay(score);
      expect(display.variant).toBe("muted");
      expect(display.label).toBe("Noch wenige Bewertungen");
    });
  });

  describe("Subcategory-Validierung", () => {
    it("filtert gueltige IDs korrekt", () => {
      const valid = validateSubcategories(["elektro", "sanitaer", "maler"]);
      expect(valid).toEqual(["elektro", "sanitaer", "maler"]);
    });

    it("filtert ungueltige IDs heraus", () => {
      const valid = validateSubcategories(["elektro", "INVALID", "xyz", "maler"]);
      expect(valid).toEqual(["elektro", "maler"]);
    });

    it("gibt leeres Array bei nur ungueltigen IDs", () => {
      const valid = validateSubcategories(["INVALID", "xyz"]);
      expect(valid).toEqual([]);
    });

    it("akzeptiert alle definierten Subcategories", () => {
      const allIds = CRAFTSMAN_SUBCATEGORIES.map((s) => s.id);
      const valid = validateSubcategories([...allIds]);
      expect(valid).toEqual(allIds);
    });
  });

  describe("Gewichtete Formel mit confirmed_usage", () => {
    it("confirmed_usage verdoppelt das Gewicht", () => {
      // 1 positive confirmed (2.0) + 2 negative unconfirmed (je 1.0)
      const withConfirm: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: true },
          { recommends: false, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
        ],
        usageEvents: [],
      };

      // 1 positive unconfirmed (1.0) + 2 negative unconfirmed (je 1.0)
      const withoutConfirm: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
          { recommends: false, confirmed_usage: false },
        ],
        usageEvents: [],
      };

      const scoreWith = calculateTrustScore(withConfirm);
      const scoreWithout = calculateTrustScore(withoutConfirm);

      // confirmed_usage sollte die positive Stimme staerker gewichten
      expect(scoreWith.weighted_score).toBeGreaterThan(scoreWithout.weighted_score);
    });

    it("nutzt TRUST_SCORE_CONFIG Werte", () => {
      expect(TRUST_SCORE_CONFIG.MIN_RECOMMENDATIONS).toBe(3);
      expect(TRUST_SCORE_CONFIG.CONFIRMED_USAGE_WEIGHT).toBe(2.0);
      expect(TRUST_SCORE_CONFIG.DEFAULT_WEIGHT).toBe(1.0);
      expect(TRUST_SCORE_CONFIG.LOYALTY_THRESHOLD).toBe(3);
    });
  });

  describe("Usage-Events Berechnung", () => {
    it("zaehlt unique Users korrekt", () => {
      const input: TrustScoreInput = {
        recommendations: [
          { recommends: true, confirmed_usage: false },
          { recommends: true, confirmed_usage: false },
          { recommends: true, confirmed_usage: false },
        ],
        usageEvents: [
          { user_id: "u1", used_at: "2026-01-01T10:00:00Z" },
          { user_id: "u1", used_at: "2026-02-01T10:00:00Z" },
          { user_id: "u2", used_at: "2026-02-15T10:00:00Z" },
          { user_id: "u3", used_at: "2026-03-01T10:00:00Z" },
          { user_id: "u1", used_at: "2026-03-15T10:00:00Z" },
        ],
      };
      const score = calculateTrustScore(input);
      expect(score.total_usage_events).toBe(5);
      expect(score.unique_users_count).toBe(3);
      expect(score.last_used_at).toBe("2026-03-15T10:00:00Z");
    });
  });

  describe("formatTrustDisplay alle Varianten", () => {
    it("positive: >= 0.8", () => {
      expect(formatTrustDisplay({ has_minimum: true, weighted_score: 0.8, display_score: 8, total_recommendations: 5 } as any).variant).toBe("positive");
      expect(formatTrustDisplay({ has_minimum: true, weighted_score: 1.0, display_score: 10, total_recommendations: 5 } as any).variant).toBe("positive");
    });

    it("neutral: 0.5-0.79", () => {
      expect(formatTrustDisplay({ has_minimum: true, weighted_score: 0.5, display_score: 5, total_recommendations: 5 } as any).variant).toBe("neutral");
      expect(formatTrustDisplay({ has_minimum: true, weighted_score: 0.79, display_score: 8, total_recommendations: 5 } as any).variant).toBe("neutral");
    });

    it("low: < 0.5", () => {
      expect(formatTrustDisplay({ has_minimum: true, weighted_score: 0.49, display_score: 5, total_recommendations: 5 } as any).variant).toBe("low");
      expect(formatTrustDisplay({ has_minimum: true, weighted_score: 0.0, display_score: 0, total_recommendations: 5 } as any).variant).toBe("low");
    });

    it("muted: has_minimum = false", () => {
      expect(formatTrustDisplay({ has_minimum: false } as any).variant).toBe("muted");
    });
  });
});
