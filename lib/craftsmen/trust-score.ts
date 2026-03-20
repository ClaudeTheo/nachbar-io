// lib/craftsmen/trust-score.ts
import { TRUST_SCORE_CONFIG } from "@/lib/constants";
import type { CraftsmanTrustScore } from "@/lib/supabase/types";

export interface TrustScoreInput {
  recommendations: Array<{
    recommends: boolean;
    confirmed_usage: boolean;
  }>;
  usageEvents: Array<{
    user_id: string;
    used_at: string;
  }>;
}

export interface TrustDisplay {
  label: string;
  variant: "positive" | "neutral" | "low" | "muted";
}

export function calculateTrustScore(input: TrustScoreInput): CraftsmanTrustScore {
  const { recommendations, usageEvents } = input;
  const { MIN_RECOMMENDATIONS, CONFIRMED_USAGE_WEIGHT, DEFAULT_WEIGHT } = TRUST_SCORE_CONFIG;

  if (recommendations.length === 0) {
    return {
      total_recommendations: 0,
      positive_recommendations: 0,
      weighted_score: 0,
      display_score: 0,
      has_minimum: false,
      total_usage_events: usageEvents.length,
      last_used_at: null,
      unique_users_count: 0,
    };
  }

  let weightedRec = 0;
  let weightedTotal = 0;
  let positiveCount = 0;

  for (const rec of recommendations) {
    const weight = rec.confirmed_usage ? CONFIRMED_USAGE_WEIGHT : DEFAULT_WEIGHT;
    weightedTotal += weight;
    if (rec.recommends) {
      weightedRec += weight;
      positiveCount++;
    }
  }

  const weightedScore = weightedTotal > 0 ? weightedRec / weightedTotal : 0;

  // Usage-Events auswerten
  const uniqueUsers = new Set(usageEvents.map((e) => e.user_id));
  const sortedEvents = [...usageEvents].sort(
    (a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime()
  );

  return {
    total_recommendations: recommendations.length,
    positive_recommendations: positiveCount,
    weighted_score: weightedScore,
    display_score: Math.round(weightedScore * 10),
    has_minimum: recommendations.length >= MIN_RECOMMENDATIONS,
    total_usage_events: usageEvents.length,
    last_used_at: sortedEvents[0]?.used_at ?? null,
    unique_users_count: uniqueUsers.size,
  };
}

export function formatTrustDisplay(score: CraftsmanTrustScore): TrustDisplay {
  if (!score.has_minimum) {
    return { label: "Noch wenige Bewertungen", variant: "muted" };
  }

  const label = `${score.display_score} von 10 Nachbarn empfehlen`;

  if (score.weighted_score >= 0.8) {
    return { label, variant: "positive" };
  }
  if (score.weighted_score >= 0.5) {
    return { label, variant: "neutral" };
  }
  return { label, variant: "low" };
}
