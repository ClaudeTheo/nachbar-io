// __tests__/app/kreis-start.test.tsx
// Phase 1 Design-Doc 2026-04-10 Abschnitt 3: 4-Kachel-Startscreen fuer Bewohner 65+.
// Seit Welle SB ist KreisStartPage eine async Server-Komponente (laedt Foto +
// Stickies). Daher Supabase-Server-Client + Senior-Kiosk-Service mocken und die
// Komponente mit `render(await KreisStartPage())` rendern.

import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  getSeniorHouseholdPhotos: vi.fn().mockResolvedValue([]),
  getSeniorHouseholdStickies: vi.fn().mockResolvedValue([]),
}));

import KreisStartPage from "@/app/(senior)/kreis-start/page";

afterEach(() => {
  cleanup();
});

describe("KreisStartPage (Phase 1 Design-Doc 3)", () => {
  it("rendert genau 4 Kacheln mit den vorgegebenen Labels", async () => {
    render(await KreisStartPage());

    expect(screen.getByRole("link", { name: /Mein Kreis/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Hier bei mir/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Schreiben/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Notfall/i })).toBeDefined();

    // Genau 4 Kacheln, nicht mehr
    const tiles = screen.getAllByTestId("kreis-start-tile");
    expect(tiles).toHaveLength(4);
  });

  it("jede Kachel hat eine Kurzbeschreibung", async () => {
    render(await KreisStartPage());
    // getAllByText, weil Link-Aggregation dazu fuehrt dass der Text
    // sowohl im <span> als auch im umgebenden <a> matchen kann.
    expect(
      screen.getAllByText(/Familie, Nachrichten, Video anrufen/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Wetter, M(ü|ue)ll, was gerade ist/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Nachricht oder Termin schreiben/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hilfe rufen/i).length).toBeGreaterThan(0);
  });

  it("Kacheln haben min-height 80px fuer Senior-Touch-Targets", async () => {
    render(await KreisStartPage());
    const tiles = screen.getAllByTestId("kreis-start-tile");
    // Die min-height wird via Inline-Style gesetzt, nicht via externe CSS-Datei
    // (testbar im jsdom ohne Computed-Style).
    for (const tile of tiles) {
      const style = tile.getAttribute("style") ?? "";
      expect(style).toContain("min-height");
    }
  });

  it("Notfall-Kachel nutzt kontraststarkes Rot und nennt 112", async () => {
    render(await KreisStartPage());

    const emergencyTile = screen.getByRole("link", { name: /Notfall 112/i });
    expect(emergencyTile).toHaveAttribute("href", "/sos");
    expect(emergencyTile.className).toContain("bg-red-900");
    expect(emergencyTile.className).toContain("border-red-950");
    expect(emergencyTile.className).toContain("text-white");
  });

  it("zeigt Termine-Link unterhalb der Kacheln", async () => {
    const { container } = render(await KreisStartPage());
    const link = container.querySelector(
      '[data-testid="kreis-start-termine-link"]',
    );
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/meine-termine");
    expect(link!.textContent).toContain("Termine");
  });

  it("keine Badges mit Zahlen (Design-Doc 3.1)", async () => {
    render(await KreisStartPage());
    // Screen-reader-text oder sichtbarer Text mit Zahlen in Kachel-Position
    // darf es nicht geben. Wir pruefen negativ, dass keine <span role="status">
    // mit Zahlen existiert.
    const badges = document.querySelectorAll("[role='status'], .badge");
    expect(badges.length).toBe(0);
  });
});
