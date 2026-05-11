// Tests für DiscoverGrid-Komponente
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { DiscoverGrid, filterTilesByFlags } from "../DiscoverGrid";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

// Hoisted-Mock fuer getFeatureFlags — default-Verhalten: keine Tiles abgeschaltet.
// Einzelne Tests koennen den Mock pro Test ueberschreiben.
const { mockGetFeatureFlags } = vi.hoisted(() => ({
  mockGetFeatureFlags: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: mockGetFeatureFlags,
}));

beforeEach(() => {
  mockGetFeatureFlags.mockReset();
  // Default: leeres Flags-Array → alle Tiles sichtbar (Default-True-Verhalten)
  mockGetFeatureFlags.mockResolvedValue([]);
});

describe("DiscoverGrid", () => {
  it("zeigt initial 12 primaere Kategorien", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const links = grid.querySelectorAll("a");
    expect(links.length).toBe(12);
  });

  it("zeigt 'Mehr entdecken' Button", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector('[data-testid="discover-expand"]');
    expect(btn).toBeInTheDocument();
  });

  it("zeigt alle Kategorien nach Klick auf 'Mehr entdecken'", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const links = grid.querySelectorAll("a");
    // 12 primaer + 13 sekundaer = 25
    expect(links.length).toBe(25);
    // Button verschwindet
    expect(
      container.querySelector('[data-testid="discover-expand"]'),
    ).not.toBeInTheDocument();
  });

  it("hat Lucide-Icons statt Emojis", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const svgs = grid.querySelectorAll("svg");
    expect(svgs.length).toBe(12);
  });

  it("primary enthaelt Leihboerse + Mitessen (vorher versteckt)", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const hrefs = Array.from(grid.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/leihboerse");
    expect(hrefs).toContain("/mitessen");
  });

  it("/events-Tile traegt deutsches Label 'Veranstaltungen' (nicht 'Events')", () => {
    // Hintergrund: Founder hat Tile nicht gefunden, weil er nach "Veranstaltungen"
    // suchte. UI-Texte muessen deutsch sein (siehe CLAUDE.md Sprachregel).
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const eventsTile = Array.from(grid.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/events",
    );
    expect(eventsTile).toBeTruthy();
    expect(eventsTile!.textContent).toContain("Veranstaltungen");
    expect(eventsTile!.textContent).not.toContain("Events");
  });

  it("filterTilesByFlags blendet Tiles mit disabled-Flag aus", () => {
    const items = [
      { flagKey: "DISCOVER_TILE_A" },
      { flagKey: "DISCOVER_TILE_B" },
      { flagKey: "DISCOVER_TILE_C" },
    ];
    const disabled = new Set(["DISCOVER_TILE_B"]);
    const visible = filterTilesByFlags(items, disabled);
    expect(visible).toHaveLength(2);
    expect(visible.map((t) => t.flagKey)).toEqual([
      "DISCOVER_TILE_A",
      "DISCOVER_TILE_C",
    ]);
  });

  it("blendet Tile aus wenn Admin-Flag enabled=false setzt", async () => {
    mockGetFeatureFlags.mockResolvedValueOnce([
      {
        key: "DISCOVER_TILE_EVENTS",
        enabled: false,
        required_roles: [],
        required_plans: [],
        enabled_quarters: [],
        admin_override: false,
      },
    ]);

    const { container } = render(<DiscoverGrid />);

    await waitFor(() => {
      const grid = container.querySelector('[data-testid="discover-grid"]')!;
      const hrefs = Array.from(grid.querySelectorAll("a")).map((a) =>
        a.getAttribute("href"),
      );
      expect(hrefs).not.toContain("/events");
    });

    // Andere Primary-Tiles bleiben sichtbar
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const remaining = grid.querySelectorAll("a");
    expect(remaining.length).toBe(11); // 12 - 1 (Events ausgeblendet)
  });

  it("Section verschwindet komplett wenn alle Tiles abgeschaltet sind", async () => {
    // Alle 25 Tile-Keys auf disabled
    const allTileKeys = [
      "BOARD", "MARKETPLACE", "LEIHBOERSE", "MITESSEN", "MAP", "HILFE",
      "GRUPPEN", "PRAEVENTION", "WASTE_CALENDAR", "REPORTS", "EVENTS", "EXPERTS",
      "MY_DAY", "PACKAGES", "PFLEGEGRAD_NAVIGATOR", "WHOHAS", "MESSAGES", "NOISE",
      "HANDWERKER", "LOST_FOUND", "TIPS", "CITY_SERVICES", "CARE_SHOPPING",
      "CARE_TASKS", "SPRECHSTUNDE",
    ];
    mockGetFeatureFlags.mockResolvedValueOnce(
      allTileKeys.map((suffix) => ({
        key: `DISCOVER_TILE_${suffix}`,
        enabled: false,
        required_roles: [],
        required_plans: [],
        enabled_quarters: [],
        admin_override: false,
      })),
    );

    const { container } = render(<DiscoverGrid />);

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="discover-grid"]'),
      ).not.toBeInTheDocument();
    });
  });

  it("secondary enthaelt Mein Tag + Pakete + Pflegegrad-Navigator (vorher versteckt)", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const hrefs = Array.from(grid.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/my-day");
    expect(hrefs).toContain("/packages");
    expect(hrefs).toContain("/pflegegrad-navigator");
  });
});
