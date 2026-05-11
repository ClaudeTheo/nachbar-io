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
  // === Sichtbarkeit & Gesamtzaehlung ===

  it("zeigt initial 15 Tiles (3 Kategorien * 5 Tiles, Mehr-Kategorie versteckt)", () => {
    // Plan 2026-05-11 Task 3: Nachbarschaft + Hilfe & Pflege + Quartier-Info
    // sind immer sichtbar; "Mehr Funktionen" erst nach Klick auf "Mehr entdecken".
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const links = grid.querySelectorAll("a");
    expect(links.length).toBe(15);
  });

  it("zeigt 'Mehr entdecken' Button", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector('[data-testid="discover-expand"]');
    expect(btn).toBeInTheDocument();
  });

  it("zeigt alle 24 Tiles nach Klick auf 'Mehr entdecken'", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const links = grid.querySelectorAll("a");
    // 5 Nachbarschaft + 5 Hilfe&Pflege + 5 Quartier-Info + 9 Mehr = 24
    expect(links.length).toBe(24);
    // Button verschwindet
    expect(
      container.querySelector('[data-testid="discover-expand"]'),
    ).not.toBeInTheDocument();
  });

  it("hat Lucide-Icons statt Emojis (15 Tile-SVGs initial)", () => {
    // Tile-SVGs sind nur in den 3 sichtbaren Kategorie-Sektionen, nicht
    // im ChevronDown des Mehr-entdecken-Buttons.
    const { container } = render(<DiscoverGrid />);
    const tileSvgs = container.querySelectorAll(
      '[data-testid^="category-"] svg',
    );
    expect(tileSvgs.length).toBe(15);
  });

  // === Kategorie-Sektionen ===

  it("rendert die drei Kategorie-Headlines (Nachbarschaft, Hilfe & Pflege, Quartier-Info)", () => {
    const { container } = render(<DiscoverGrid />);
    expect(container.textContent).toContain("Nachbarschaft");
    expect(container.textContent).toContain("Hilfe & Pflege");
    expect(container.textContent).toContain("Quartier-Info");
  });

  it("Nachbarschaft-Sektion enthaelt Brett, Hilfe, Marktplatz, Gruppen, Veranstaltungen", () => {
    const { container } = render(<DiscoverGrid />);
    const section = container.querySelector(
      '[data-testid="category-nachbarschaft"]',
    )!;
    expect(section).toBeInTheDocument();
    const hrefs = Array.from(section.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/board",
      "/hilfe",
      "/marketplace",
      "/gruppen",
      "/events",
    ]);
  });

  it("Hilfe & Pflege-Sektion enthaelt Mein Tag, Aufgabentafel, Einkaufshilfe, Pflegegrad, Sprechstunde", () => {
    const { container } = render(<DiscoverGrid />);
    const section = container.querySelector(
      '[data-testid="category-hilfe_pflege"]',
    )!;
    expect(section).toBeInTheDocument();
    const hrefs = Array.from(section.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/my-day",
      "/care/tasks",
      "/care/shopping",
      "/pflegegrad-navigator",
      "/sprechstunde",
    ]);
  });

  it("Quartier-Info-Sektion enthaelt Karte, Muellkalender, Rathaus, Maengel, Praevention", () => {
    const { container } = render(<DiscoverGrid />);
    const section = container.querySelector(
      '[data-testid="category-quartier_info"]',
    )!;
    expect(section).toBeInTheDocument();
    const hrefs = Array.from(section.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/map",
      "/waste-calendar",
      "/city-services",
      "/reports",
      "/praevention",
    ]);
  });

  it("Mehr-Sektion ist initial nicht im DOM, erscheint nach Klick", () => {
    const { container } = render(<DiscoverGrid />);
    expect(
      container.querySelector('[data-testid="category-mehr"]'),
    ).not.toBeInTheDocument();
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const mehrSection = container.querySelector(
      '[data-testid="category-mehr"]',
    )!;
    expect(mehrSection).toBeInTheDocument();
    const hrefs = Array.from(mehrSection.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/experts",
      "/handwerker",
      "/leihboerse",
      "/mitessen",
      "/whohas",
      "/packages",
      "/lost-found",
      "/noise",
      "/tips",
    ]);
  });

  // === Label-Pflicht (deutsche Sprache + Eindeutigkeit) ===

  it("/events-Tile traegt deutsches Label 'Veranstaltungen' (nicht 'Events')", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const eventsTile = Array.from(grid.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/events",
    );
    expect(eventsTile).toBeTruthy();
    expect(eventsTile!.textContent).toContain("Veranstaltungen");
    expect(eventsTile!.textContent).not.toContain("Events");
  });

  it("/waste-calendar-Tile traegt eindeutiges Label 'Muellkalender'", () => {
    // Plan 2026-05-11 Task 4: "Kalender" liest sich wie Veranstaltungskalender,
    // ist aber der Muellabfuhr-Kalender — Senior-Erwartungsbruch beseitigen.
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const tile = Array.from(grid.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/waste-calendar",
    );
    expect(tile).toBeTruthy();
    expect(tile!.textContent).toContain("Muellkalender");
    expect(tile!.textContent).not.toMatch(/^Kalender$/);
  });

  it("Chat-Tile ist nicht im DiscoverGrid (Duplikat zu Nachrichten-Schnellzugriff)", () => {
    // Plan 2026-05-11 Task 2: Schnellzugriff "Nachrichten" auf Dashboard ist
    // primaerer Pfad; "Chat"-Tile waere ein Duplikat.
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const hrefs = Array.from(grid.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).not.toContain("/messages");
  });

  // === Feature-Flag-Filter (Admin-Toggle) ===

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

  it("blendet Tile aus wenn Admin-Flag enabled=false setzt (z.B. Veranstaltungen)", async () => {
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

    // Nachbarschaft-Sektion hat dann nur noch 4 Tiles
    const nachbarschaft = container.querySelector(
      '[data-testid="category-nachbarschaft"]',
    )!;
    expect(nachbarschaft.querySelectorAll("a").length).toBe(4);
  });

  it("Section verschwindet komplett wenn alle Tiles abgeschaltet sind", async () => {
    // Wir benutzen die echte Tile-Liste der Komponente, damit der Test bei
    // einem hinzugefuegten Tile nicht stillschweigend weiterlaeuft (Reviewer-
    // Befund 2026-05-11: hardcoded list driftet von allItems weg).
    const { allItems } = await import("../DiscoverGrid");
    mockGetFeatureFlags.mockResolvedValueOnce(
      allItems.map((item) => ({
        key: item.flagKey,
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

  it("Kategorie-Sektion verschwindet wenn alle Tiles dieser Kategorie ab sind", async () => {
    // Alle Quartier-Info-Tiles abschalten — Sektion sollte komplett verschwinden
    mockGetFeatureFlags.mockResolvedValueOnce(
      ["MAP", "WASTE_CALENDAR", "CITY_SERVICES", "REPORTS", "PRAEVENTION"].map(
        (suffix) => ({
          key: `DISCOVER_TILE_${suffix}`,
          enabled: false,
          required_roles: [],
          required_plans: [],
          enabled_quarters: [],
          admin_override: false,
        }),
      ),
    );

    const { container } = render(<DiscoverGrid />);

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="category-quartier_info"]'),
      ).not.toBeInTheDocument();
    });

    // Andere Kategorien bleiben
    expect(
      container.querySelector('[data-testid="category-nachbarschaft"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="category-hilfe_pflege"]'),
    ).toBeInTheDocument();
  });
});
