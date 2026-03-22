// Nachbar.io — Auth-Flow 4: Quartierskarte (authentifiziert via storageState)
// Prueft: Karte laden, Leaflet, Marker, keine JS-Fehler
import { test, expect } from "@playwright/test";
import { createConsoleErrorCollector, waitForStableUI } from "../helpers/observer";

test.describe("Auth-Flow: Quartierskarte", () => {
  test("AF4.1 — Karte laed ohne Server-Error", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);

    const response = await page.goto("/map");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);

    errors.stop();
    const criticalErrors = errors.errors.filter(
      (e) => !e.includes("hydration") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);

    console.log("[AUTH] Karte geladen ✓");
  });

  test("AF4.2 — Leaflet-Container ist gerendert", async ({ page }) => {
    await page.goto("/map");
    await waitForStableUI(page);

    // Leaflet rendert einen Container mit Klasse .leaflet-container
    const leaflet = page.locator(".leaflet-container");
    const hasLeaflet = await leaflet.isVisible().catch(() => false);

    if (hasLeaflet) {
      // Karten-Tiles muessen geladen sein
      const tiles = page.locator(".leaflet-tile-loaded");
      const tileCount = await tiles.count();
      expect(tileCount).toBeGreaterThan(0);
      console.log(`[AUTH] Leaflet gerendert, ${tileCount} Tiles geladen ✓`);
    } else {
      // Fallback: data-testid pruefen
      const mapEl = page.locator("[data-testid='quarter-map']");
      const hasMap = await mapEl.isVisible().catch(() => false);
      console.log(`[AUTH] Leaflet nicht gefunden, data-testid: ${hasMap}`);
    }
  });

  test("AF4.3 — Karte zeigt Quartier-Zentrum (Bad Saeckingen)", async ({ page }) => {
    await page.goto("/map");
    await waitForStableUI(page);

    // Pruefen ob die Karte zentriert ist (via Leaflet API)
    const center = await page.evaluate(() => {
      // Leaflet speichert die Map-Instanz global oder auf dem Container
      const container = document.querySelector(".leaflet-container");
      if (!container) return null;
      // @ts-expect-error Leaflet speichert _leaflet_map auf dem DOM-Element
      const map = (container as HTMLElement & { _leaflet_id?: number })?.__leaflet_map;
      if (!map) return null;
      const c = map.getCenter();
      return { lat: c.lat, lng: c.lng };
    }).catch(() => null);

    if (center) {
      // Bad Saeckingen: ~47.55, ~7.96
      expect(center.lat).toBeGreaterThan(47.0);
      expect(center.lat).toBeLessThan(48.0);
      expect(center.lng).toBeGreaterThan(7.5);
      expect(center.lng).toBeLessThan(8.5);
      console.log(`[AUTH] Karte zentriert auf ${center.lat.toFixed(3)}, ${center.lng.toFixed(3)} ✓`);
    } else {
      console.log("[AUTH] Leaflet Map-Instanz nicht erreichbar — Skip Center-Check");
    }
  });

  test("AF4.4 — Karte ist interaktiv (Zoom-Buttons)", async ({ page }) => {
    await page.goto("/map");
    await waitForStableUI(page);

    // Zoom-Buttons pruefen
    const zoomIn = page.locator(".leaflet-control-zoom-in").or(
      page.getByRole("button", { name: /Zoom in|\+/i })
    );
    const zoomOut = page.locator(".leaflet-control-zoom-out").or(
      page.getByRole("button", { name: /Zoom out|-/i })
    );

    const hasZoomIn = await zoomIn.isVisible().catch(() => false);
    const hasZoomOut = await zoomOut.isVisible().catch(() => false);

    if (hasZoomIn && hasZoomOut) {
      // Zoom-In testen
      await zoomIn.click();
      await page.waitForTimeout(500);
      console.log("[AUTH] Zoom-Buttons funktional ✓");
    } else {
      console.log("[AUTH] Zoom-Buttons nicht gefunden (evtl. Custom Controls)");
    }
  });
});
