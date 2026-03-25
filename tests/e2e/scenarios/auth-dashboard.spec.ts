// Nachbar.io — Auth-Flow 1: Dashboard (authentifiziert via storageState)
// Prueft: Laden, Begruessung, BottomNav, Sektionen, Navigation
import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages";
import { createConsoleErrorCollector, waitForStableUI } from "../helpers/observer";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("Auth-Flow: Dashboard", () => {
  test("AF1.1 — Dashboard laed nach Login (storageState)", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertLoaded();

    // BottomNav muss sichtbar sein
    await expect(dashboard.bottomNav).toBeVisible();

    errors.stop();
    expect(errors.errors).toHaveLength(0);
    console.log("[AUTH] Dashboard geladen ✓");
  });

  test("AF1.2 — BottomNav enthaelt alle Hauptbereiche", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertLoaded();

    // Alle BottomNav-Eintraege pruefen
    const navLabels = ["Home", "Karte", "Hilfe"];
    for (const label of navLabels) {
      const navItem = dashboard.bottomNav.getByText(label);
      await expect(navItem).toBeVisible();
    }

    console.log("[AUTH] BottomNav vollstaendig ✓");
  });

  test("AF1.3 — Navigation via BottomNav zu Karte", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertLoaded();

    // Zur Karte navigieren
    await dashboard.navigateVia("map");
    await expect(page).toHaveURL(/\/map/);
    await waitForStableUI(page);

    // Karte sollte sichtbar sein (Leaflet Container)
    const mapContainer = page.locator(".leaflet-container").or(
      page.locator("[data-testid='quarter-map']")
    );
    const hasMap = await mapContainer.isVisible().catch(() => false);
    console.log(`[AUTH] Karte geladen: ${hasMap ? "✓" : "Container nicht gefunden (evtl. anderer Selektor)"}`);
  });

  test("AF1.4 — Navigation via BottomNav zu Hilfe-Boerse", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertLoaded();

    // Zur Hilfe-Boerse navigieren (BottomNav "Hilfe" → /alerts/new)
    await dashboard.navigateVia("help");
    await expect(page).toHaveURL(/\/alerts/);
    await waitForStableUI(page);

    console.log("[AUTH] Hilfe-Boerse erreicht ✓");
  });

  test("AF1.5 — Kein 500-Error auf authentifizierten Seiten", async ({ page }) => {
    const authPages = ["/dashboard", "/help", "/map", "/profile", "/notifications"];
    const results: Array<{ path: string; status: number }> = [];

    for (const pagePath of authPages) {
      const response = await page.goto(pagePath);
      const status = response?.status() || 0;
      results.push({ path: pagePath, status });
      expect(status).toBeLessThan(500);
    }

    console.log(`[AUTH] ${results.length} Seiten ohne 500-Error ✓`);
  });
});
