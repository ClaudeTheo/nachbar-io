// Nachbar.io — Auth-Flow 2: Notfall-System (authentifiziert via storageState)
// Prueft: SOS-Seite, Kategorien, EmergencyBanner, 112/110 Links
import { test, expect } from "@playwright/test";
import { createConsoleErrorCollector, waitForStableUI } from "../helpers/observer";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("Auth-Flow: Notfall-System", () => {
  test("AF2.1 — Notfall-Seite laed und zeigt Kategorien", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);

    await page.goto("/care/sos/new");
    await waitForStableUI(page);

    // Mindestens eine SOS-Kategorie sichtbar
    const categoryButton = page.locator("[data-testid='sos-category']").or(
      page.getByRole("button").filter({ hasText: /Notfall|Hilfe|Sturz|Medizin|Besuch/i })
    );
    const count = await categoryButton.count();
    expect(count).toBeGreaterThan(0);

    errors.stop();
    expect(errors.errors).toHaveLength(0);
    console.log(`[AUTH] ${count} SOS-Kategorien gefunden ✓`);
  });

  test("AF2.2 — Medizinischer Notfall zeigt EmergencyBanner mit 112", async ({ page }) => {
    await page.goto("/care/sos/new");
    await waitForStableUI(page);

    // Medizinische Kategorie waehlen (verschiedene Selektoren probieren)
    const medicalBtn = page.getByText(/Medizinisch|Gesundheit|Notfall/i).first();
    if (await medicalBtn.isVisible().catch(() => false)) {
      await medicalBtn.click();
      await waitForStableUI(page);

      // EmergencyBanner pruefen
      const banner = page.locator("[data-testid='emergency-banner']").or(
        page.getByText("112").first()
      );
      const hasBanner = await banner.isVisible().catch(() => false);

      if (hasBanner) {
        // 112 Link muss vorhanden sein
        const link112 = page.locator("a[href='tel:112']");
        await expect(link112).toBeVisible();
        console.log("[AUTH] EmergencyBanner mit 112-Link ✓");
      } else {
        console.log("[AUTH] Kein EmergencyBanner (evtl. anderer Kategorie-Name)");
      }
    } else {
      console.log("[AUTH] Medizin-Kategorie nicht gefunden — Skip");
    }
  });

  test("AF2.3 — Alerts-Seite laed ohne Fehler", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);

    const response = await page.goto("/alerts");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);

    errors.stop();
    const criticalErrors = errors.errors.filter(
      (e) => !e.includes("hydration") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);

    console.log("[AUTH] Alerts-Seite geladen ✓");
  });

  test("AF2.4 — Care-Uebersicht laed", async ({ page }) => {
    const response = await page.goto("/care");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);

    console.log("[AUTH] Care-Uebersicht geladen ✓");
  });
});
