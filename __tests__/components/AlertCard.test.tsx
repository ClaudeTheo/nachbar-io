// __tests__/components/AlertCard.test.tsx
// Tests fuer AlertCard:
// 1. Kompakt-Modus: Description versteckt
// 2. Kompakt-Modus: Tap klappt auf, Description sichtbar
// 3. Kompakt-Modus: Chevron rotiert bei expanded
// 4. Standard-Modus: Description sofort sichtbar

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// --- Mocks ---

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

vi.mock("@/components/CategoryIcon", () => ({
  CategoryIcon: () => <div data-testid="category-icon" />,
}));

vi.mock("@/components/ReputationBadge", () => ({
  ReputationBadge: () => <span data-testid="reputation-badge" />,
}));

vi.mock("@/lib/category-icons", () => ({
  ALERT_ICON_MAP: {},
  FALLBACK_ICON: {
    icon: () => null,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-500",
  },
}));

vi.mock("@/lib/constants", () => ({
  ALERT_CATEGORIES: [],
}));

// Mock UI-Komponenten
vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

import { AlertCard } from "@/components/AlertCard";
import { haptic } from "@/lib/haptics";

const mockAlert = {
  id: "alert-1",
  title: "WLAN-Router defekt",
  description: "Brauche Hilfe mit meinem Router.",
  category: "tech_help" as const,
  status: "open" as const,
  is_emergency: false,
  current_radius: 500,
  location_lat: null,
  location_lng: null,
  location_source: null,
  created_at: new Date().toISOString(),
  resolved_at: null,
  quarter_id: "q-1",
  user_id: "u-1",
  household_id: "h-1",
  user: { display_name: "Maria K.", avatar_url: null },
  household: {
    street_name: "Purkersdorfer Str.",
    house_number: "12",
    lat: 47.5,
    lng: 7.9,
  },
  responses: [],
};

// Hilfsfunktion: Toggle-Button im compact-Modus finden
function getExpandButton() {
  return screen.getByRole("button", { name: /WLAN-Router defekt/ });
}

describe("AlertCard", () => {
  afterEach(cleanup);

  describe("Kompakt-Modus", () => {
    it("startet im zugeklappten Zustand (aria-expanded=false)", () => {
      render(<AlertCard alert={mockAlert} compact />);
      const btn = getExpandButton();
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });

    it("klappt auf bei Tap (aria-expanded=true)", () => {
      render(<AlertCard alert={mockAlert} compact />);
      const btn = getExpandButton();
      fireEvent.click(btn);
      expect(btn).toHaveAttribute("aria-expanded", "true");
    });

    it("Grid-Container wechselt auf grid-rows-[1fr] nach Expand", () => {
      render(<AlertCard alert={mockAlert} compact />);
      const btn = getExpandButton();
      // Zustand vor Expand: grid-rows-[0fr]
      const gridContainer = screen
        .getByText(mockAlert.description)
        .closest(".grid");
      expect(gridContainer).toHaveClass("grid-rows-[0fr]");
      // Expand
      fireEvent.click(btn);
      expect(gridContainer).toHaveClass("grid-rows-[1fr]");
    });

    it("ruft haptic('light') beim Toggle auf", () => {
      render(<AlertCard alert={mockAlert} compact />);
      fireEvent.click(getExpandButton());
      expect(haptic).toHaveBeenCalledWith("light");
    });

    it("zeigt Titel und Badge immer an", () => {
      render(<AlertCard alert={mockAlert} compact />);
      expect(screen.getByText("WLAN-Router defekt")).toBeInTheDocument();
      expect(screen.getByText("Offen")).toBeInTheDocument();
    });

    it("klappt bei erneutem Tap wieder zu", () => {
      render(<AlertCard alert={mockAlert} compact />);
      const btn = getExpandButton();
      fireEvent.click(btn); // auf
      fireEvent.click(btn); // zu
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Standard-Modus", () => {
    it("zeigt Description sofort an", () => {
      render(<AlertCard alert={mockAlert} />);
      expect(screen.getByText(mockAlert.description)).toBeInTheDocument();
    });

    it("zeigt Hilfe-Button bei offenen Alerts mit onHelp", () => {
      const onHelp = vi.fn();
      render(<AlertCard alert={mockAlert} onHelp={onHelp} />);
      expect(screen.getByText("Ich kann helfen")).toBeInTheDocument();
    });
  });
});
