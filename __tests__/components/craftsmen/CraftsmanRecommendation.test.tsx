import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CraftsmanRecommendation } from "@/components/craftsmen/CraftsmanRecommendation";

vi.mock("@/lib/craftsmen/hooks", () => ({
  submitRecommendation: vi.fn().mockResolvedValue({ error: null }),
  logUsageEvent: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CraftsmanRecommendation", () => {
  it("zeigt Empfehlungs-Buttons (Ja/Nein)", () => {
    render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={false}
        recommendations={[]}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByText("Ja, empfehle ich").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Nein").length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Checkbox 'Ich habe diesen Handwerker beauftragt'", () => {
    render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={false}
        recommendations={[]}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByText("Ich habe diesen Handwerker beauftragt").length).toBeGreaterThanOrEqual(1);
  });

  it("versteckt Formular fuer Eigentuemer", () => {
    const { container } = render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={true}
        recommendations={[]}
        onUpdate={vi.fn()}
      />
    );
    expect(container.textContent).toContain("eigenen Eintrag nicht empfehlen");
    // Innerhalb dieses Renders keine Empfehlungs-Buttons
    expect(container.textContent).not.toContain("Ja, empfehle ich");
  });

  it("zeigt bestehende Empfehlung des aktuellen Nutzers", () => {
    render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={false}
        recommendations={[
          {
            id: "r1",
            tip_id: "t1",
            user_id: "u1",
            recommends: true,
            confirmed_usage: true,
            aspects: null,
            comment: "Super Arbeit!",
            created_at: "2026-03-15T10:00:00Z",
            updated_at: "2026-03-15T10:00:00Z",
            user: { display_name: "Thomas", avatar_url: null },
          },
        ]}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByText("Sie empfehlen diesen Handwerker").length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Same-Street-Badge", () => {
    render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={false}
        recommendations={[
          {
            id: "r1",
            tip_id: "t1",
            user_id: "u2",
            recommends: true,
            confirmed_usage: false,
            aspects: null,
            comment: "Gut",
            created_at: "2026-03-15T10:00:00Z",
            updated_at: "2026-03-15T10:00:00Z",
            user: { display_name: "Max", avatar_url: null },
            same_street: true,
          },
        ]}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByText("Aus Ihrer Straße").length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt 'Erneut beauftragt' Button bei eigener Empfehlung", () => {
    render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={false}
        recommendations={[
          {
            id: "r1",
            tip_id: "t1",
            user_id: "u1",
            recommends: true,
            confirmed_usage: true,
            aspects: null,
            comment: null,
            created_at: "2026-03-15T10:00:00Z",
            updated_at: "2026-03-15T10:00:00Z",
            user: { display_name: "Thomas", avatar_url: null },
          },
        ]}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getAllByText("Erneut beauftragt").length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Aspekt-Bewertung nach Auswahl", () => {
    render(
      <CraftsmanRecommendation
        tipId="t1"
        currentUserId="u1"
        isOwner={false}
        recommendations={[]}
        onUpdate={vi.fn()}
      />
    );
    // Aspekte erst nach Auswahl sichtbar
    expect(screen.queryByText(/Qualität/)).not.toBeInTheDocument();
    // Klick auf den ersten "Ja, empfehle ich" Button
    fireEvent.click(screen.getAllByText("Ja, empfehle ich")[0]);
    expect(screen.getAllByText(/Qualität/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pünktlichkeit/).length).toBeGreaterThanOrEqual(1);
  });
});
