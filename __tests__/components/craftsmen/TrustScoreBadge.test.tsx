import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustScoreBadge } from "@/components/craftsmen/TrustScoreBadge";
import type { CraftsmanTrustScore } from "@/lib/supabase/types";

const baseScore: CraftsmanTrustScore = {
  total_recommendations: 10,
  positive_recommendations: 8,
  weighted_score: 0.85,
  display_score: 9,
  has_minimum: true,
  total_usage_events: 5,
  last_used_at: "2026-03-10T10:00:00Z",
  unique_users_count: 4,
};

describe("TrustScoreBadge", () => {
  it("zeigt 'Noch wenige Bewertungen' unter Minimum", () => {
    render(<TrustScoreBadge score={{ ...baseScore, has_minimum: false, total_recommendations: 2 }} />);
    expect(screen.getByText("Noch wenige Bewertungen")).toBeInTheDocument();
  });

  it("zeigt Score-Anzeige bei genuegend Empfehlungen", () => {
    render(<TrustScoreBadge score={baseScore} />);
    expect(screen.getByText(/9 von 10 Nachbarn empfehlen/)).toBeInTheDocument();
  });

  it("zeigt Aktualitaet wenn last_used_at vorhanden", () => {
    render(<TrustScoreBadge score={baseScore} showRecency />);
    expect(screen.getByText(/Zuletzt beauftragt/)).toBeInTheDocument();
  });

  it("zeigt Nutzungsanzahl", () => {
    render(<TrustScoreBadge score={baseScore} showUsageCount />);
    expect(screen.getByText(/5× beauftragt/)).toBeInTheDocument();
  });

  it("versteckt Zusatz-Signale unter Minimum", () => {
    const { container } = render(
      <TrustScoreBadge
        score={{ ...baseScore, has_minimum: false }}
        showRecency
        showUsageCount
      />
    );
    expect(container.textContent).not.toContain("Zuletzt beauftragt");
    expect(container.textContent).not.toContain("× beauftragt");
  });

  it("nutzt kleine Groesse bei size='sm'", () => {
    const { container } = render(<TrustScoreBadge score={baseScore} size="sm" />);
    const badge = container.querySelector(".text-xs");
    expect(badge).toBeInTheDocument();
  });
});
