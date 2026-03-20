import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CraftsmanCard } from "@/components/craftsmen/CraftsmanCard";
import type { CommunityTip, CraftsmanTrustScore } from "@/lib/supabase/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockTip: CommunityTip = {
  id: "t1",
  user_id: "u1",
  category: "craftsmen",
  title: "Elektro Müller",
  business_name: "Elektro Müller GmbH",
  description: "Bester Elektriker in Bad Säckingen",
  location_hint: "Bad Säckingen",
  contact_hint: null,
  confirmation_count: 0,
  status: "active",
  created_at: "2026-03-15T10:00:00Z",
  subcategories: ["elektro"],
  service_area: "Bad Säckingen & Umgebung",
  service_radius_km: 20,
};

const mockScore: CraftsmanTrustScore = {
  total_recommendations: 5,
  positive_recommendations: 4,
  weighted_score: 0.85,
  display_score: 9,
  has_minimum: true,
  total_usage_events: 3,
  last_used_at: "2026-03-10T10:00:00Z",
  unique_users_count: 3,
};

describe("CraftsmanCard", () => {
  it("zeigt Business-Name und Subcategory-Icon", () => {
    render(<CraftsmanCard tip={mockTip} trustScore={mockScore} />);
    expect(screen.getByText("Elektro Müller GmbH")).toBeInTheDocument();
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("zeigt Trust-Score-Badge", () => {
    render(<CraftsmanCard tip={mockTip} trustScore={mockScore} />);
    // Badge wird in TrustScoreBadge gerendert
    const badges = screen.getAllByText(/9 von 10 Nachbarn empfehlen/);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Einzugsgebiet", () => {
    render(<CraftsmanCard tip={mockTip} trustScore={mockScore} />);
    const elements = screen.getAllByText("Bad Säckingen & Umgebung");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Nutzungsanzahl", () => {
    render(<CraftsmanCard tip={mockTip} trustScore={mockScore} />);
    const elements = screen.getAllByText(/× beauftragt/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Standort", () => {
    render(<CraftsmanCard tip={mockTip} trustScore={mockScore} />);
    const elements = screen.getAllByText("Bad Säckingen");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt Fallback-Icon ohne Subcategory", () => {
    const tipWithout = { ...mockTip, subcategories: undefined };
    render(<CraftsmanCard tip={tipWithout} trustScore={mockScore} />);
    expect(screen.getByText("🔧")).toBeInTheDocument();
  });

  it("zeigt Titel wenn kein Business-Name vorhanden", () => {
    const tipNoName = { ...mockTip, business_name: null };
    render(<CraftsmanCard tip={tipNoName} trustScore={mockScore} />);
    expect(screen.getByText("Elektro Müller")).toBeInTheDocument();
  });
});
