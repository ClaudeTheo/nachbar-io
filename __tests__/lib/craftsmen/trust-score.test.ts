// __tests__/lib/craftsmen/trust-score.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateTrustScore,
  formatTrustDisplay,
  type TrustScoreInput,
} from "@/lib/craftsmen/trust-score";
import type { CraftsmanTrustScore } from "@/lib/supabase/types";

describe("calculateTrustScore", () => {
  it("gibt has_minimum=false bei weniger als 3 Empfehlungen", () => {
    const input: TrustScoreInput = {
      recommendations: [
        { recommends: true, confirmed_usage: false },
        { recommends: true, confirmed_usage: true },
      ],
      usageEvents: [],
    };
    const result = calculateTrustScore(input);
    expect(result.has_minimum).toBe(false);
    expect(result.total_recommendations).toBe(2);
  });

  it("berechnet gewichteten Score korrekt", () => {
    const input: TrustScoreInput = {
      recommendations: [
        { recommends: true, confirmed_usage: true },   // +2.0
        { recommends: true, confirmed_usage: true },   // +2.0
        { recommends: true, confirmed_usage: false },  // +1.0
        { recommends: false, confirmed_usage: false },  // +1.0 (total)
      ],
      usageEvents: [],
    };
    const result = calculateTrustScore(input);
    expect(result.has_minimum).toBe(true);
    expect(result.weighted_score).toBeCloseTo(5 / 6, 2);
    expect(result.display_score).toBe(8);
  });

  it("berechnet 100% bei nur positiven Empfehlungen", () => {
    const input: TrustScoreInput = {
      recommendations: [
        { recommends: true, confirmed_usage: false },
        { recommends: true, confirmed_usage: false },
        { recommends: true, confirmed_usage: false },
      ],
      usageEvents: [],
    };
    const result = calculateTrustScore(input);
    expect(result.weighted_score).toBe(1.0);
    expect(result.display_score).toBe(10);
  });

  it("zaehlt Usage-Events korrekt", () => {
    const input: TrustScoreInput = {
      recommendations: [
        { recommends: true, confirmed_usage: true },
        { recommends: true, confirmed_usage: true },
        { recommends: true, confirmed_usage: false },
      ],
      usageEvents: [
        { user_id: "u1", used_at: "2026-03-01T10:00:00Z" },
        { user_id: "u1", used_at: "2026-03-15T10:00:00Z" },
        { user_id: "u2", used_at: "2026-03-10T10:00:00Z" },
      ],
    };
    const result = calculateTrustScore(input);
    expect(result.total_usage_events).toBe(3);
    expect(result.unique_users_count).toBe(2);
    expect(result.last_used_at).toBe("2026-03-15T10:00:00Z");
  });

  it("gibt Score 0 bei nur negativen Empfehlungen", () => {
    const input: TrustScoreInput = {
      recommendations: [
        { recommends: false, confirmed_usage: false },
        { recommends: false, confirmed_usage: false },
        { recommends: false, confirmed_usage: false },
      ],
      usageEvents: [],
    };
    const result = calculateTrustScore(input);
    expect(result.weighted_score).toBe(0);
    expect(result.display_score).toBe(0);
  });

  it("gibt leeren Score bei keinen Empfehlungen", () => {
    const input: TrustScoreInput = {
      recommendations: [],
      usageEvents: [],
    };
    const result = calculateTrustScore(input);
    expect(result.has_minimum).toBe(false);
    expect(result.weighted_score).toBe(0);
    expect(result.total_recommendations).toBe(0);
  });
});

describe("formatTrustDisplay", () => {
  it("zeigt 'Noch wenige Bewertungen' unter Minimum", () => {
    const result = formatTrustDisplay({ has_minimum: false } as CraftsmanTrustScore);
    expect(result.label).toBe("Noch wenige Bewertungen");
    expect(result.variant).toBe("muted");
  });

  it("zeigt gruene Anzeige bei Score >= 0.8", () => {
    const result = formatTrustDisplay({
      has_minimum: true,
      display_score: 9,
      weighted_score: 0.9,
      total_recommendations: 10,
    } as CraftsmanTrustScore);
    expect(result.label).toBe("9 von 10 Nachbarn empfehlen");
    expect(result.variant).toBe("positive");
  });

  it("zeigt neutrale Anzeige bei Score 0.5-0.79", () => {
    const result = formatTrustDisplay({
      has_minimum: true,
      display_score: 6,
      weighted_score: 0.6,
      total_recommendations: 10,
    } as CraftsmanTrustScore);
    expect(result.variant).toBe("neutral");
  });

  it("zeigt graue Anzeige bei Score < 0.5", () => {
    const result = formatTrustDisplay({
      has_minimum: true,
      display_score: 3,
      weighted_score: 0.3,
      total_recommendations: 10,
    } as CraftsmanTrustScore);
    expect(result.variant).toBe("low");
  });
});
