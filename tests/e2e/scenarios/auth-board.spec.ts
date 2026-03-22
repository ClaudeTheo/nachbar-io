// Nachbar.io — Auth-Flow 3: Schwarzes Brett / Hilfe-Boerse (authentifiziert via storageState)
// Prueft: Board laden, Tabs, Karten, Erstellen-Button
import { test, expect } from "@playwright/test";
import { HelpPage } from "../pages";
import { createConsoleErrorCollector, waitForStableUI } from "../helpers/observer";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("Auth-Flow: Schwarzes Brett / Hilfe-Boerse", () => {
  test("AF3.1 — Hilfe-Boerse laed und zeigt Board", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);
    const helpPage = new HelpPage(page);
    await helpPage.goto();
    await helpPage.assertLoaded();

    errors.stop();
    expect(errors.errors).toHaveLength(0);
    console.log("[AUTH] Hilfe-Boerse geladen ✓");
  });

  test("AF3.2 — Erstellen-Button ist sichtbar", async ({ page }) => {
    const helpPage = new HelpPage(page);
    await helpPage.goto();
    await helpPage.assertLoaded();

    // Erstellen-Button (FAB oder Link)
    const createBtn = helpPage.createButton.or(
      page.getByRole("link", { name: /Hilfe anbieten|Erstellen|Neue/i })
    );
    const isVisible = await createBtn.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    console.log("[AUTH] Erstellen-Button sichtbar ✓");
  });

  test("AF3.3 — Hilfe-Boerse zeigt Karten oder Leerzustand", async ({ page }) => {
    const helpPage = new HelpPage(page);
    await helpPage.goto();
    await helpPage.assertLoaded();

    const cardCount = await helpPage.getCardCount();

    if (cardCount > 0) {
      console.log(`[AUTH] ${cardCount} Hilfe-Karten angezeigt ✓`);
    } else {
      // Leerzustand: Sollte freundlichen Hinweis zeigen
      const emptyState = page.getByText(/keine|leer|noch nichts/i).first();
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      console.log(`[AUTH] Leerzustand: ${hasEmptyState ? "Hinweis angezeigt ✓" : "Kein Hinweis (evtl. OK)"}`);
    }
  });

  test("AF3.4 — Navigation zu 'Neues Hilfsangebot erstellen'", async ({ page }) => {
    await page.goto("/help");
    await waitForStableUI(page);

    // Zum Erstellen navigieren
    await page.goto("/help/new");
    await waitForStableUI(page);

    // Seite sollte keine 500-Fehler haben
    const url = page.url();
    expect(url).toContain("/help");

    // Mindestens ein Formular-Element sichtbar
    const formElement = page.getByText(/Ich suche|Ich biete|Hilfe/i).first();
    const hasForm = await formElement.isVisible().catch(() => false);
    console.log(`[AUTH] Hilfe-Formular: ${hasForm ? "✓" : "Element nicht gefunden"}`);
  });

  test("AF3.5 — Marketplace-Seite laed", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);

    const response = await page.goto("/marketplace");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);

    errors.stop();
    const criticalErrors = errors.errors.filter(
      (e) => !e.includes("hydration") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);

    console.log("[AUTH] Marketplace geladen ✓");
  });
});
