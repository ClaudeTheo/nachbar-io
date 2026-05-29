// Nachbar.io — Auth-Flow 1: Dashboard (authentifiziert via storageState)
// Prueft: Laden, Begruessung, BottomNav, Sektionen, Navigation
import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages";
import {
  createConsoleErrorCollector,
  waitForStableUI,
} from "../helpers/observer";

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
    // 4-Tab-Struktur (NavConfig): Start, (Mein) Quartier, Mein Tag, Ich.
    // "Quartier" matcht per Substring sowohl "Quartier" (Aktiv 55+) als auch
    // "Mein Quartier" (Senior/Komfort) — modus-unabhaengig.
    const navLabels = ["Start", "Quartier", "Mein Tag", "Ich"];
    for (const label of navLabels) {
      const navItem = dashboard.bottomNav.getByText(label);
      await expect(navItem).toBeVisible();
    }

    console.log("[AUTH] BottomNav vollstaendig ✓");
  });

  test("AF1.3 — Navigation via BottomNav zu Quartier", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertLoaded();

    // Zum "Mein Quartier"-Hub navigieren (Welle 3, Option C)
    await dashboard.navigateVia("map");
    await expect(page).toHaveURL(/\/quartier(?!-info)/);
    await waitForStableUI(page);

    // Hub zeigt Titel + Kacheln; /quartier-info ist nur EINE Kachel.
    await expect(
      page.getByRole("heading", { name: /Mein Quartier/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Wetter & Warnungen/i }),
    ).toBeVisible();
    console.log("[AUTH] Mein-Quartier-Hub erreicht ✓");
  });

  test("AF1.4 — Navigation via BottomNav zu Gesundheit", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertLoaded();

    await dashboard.navigateVia("care");
    await expect(page).toHaveURL(/\/care/);
    await waitForStableUI(page);

    console.log("[AUTH] Gesundheitsbereich erreicht ✓");
  });

  test("AF1.5 — Kein 500-Error auf authentifizierten Seiten", async ({
    page,
  }) => {
    const authPages = [
      "/dashboard",
      "/help",
      "/map",
      "/profile",
      "/notifications",
    ];
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
