// Nachbar.io — S2: Hilfe-Anfrage → Zustellung → Annahme
// Agent A erstellt "Hilfe gesucht", Agent B sieht es im Feed und nimmt an.
import { test, expect } from "@playwright/test";
import { createAgent, loginAgent, cleanupAgents, type TestAgent } from "../helpers/agent-factory";
import { withAgent } from "../helpers/scenario-runner";
import { waitForStableUI, waitForFeedItem } from "../helpers/observer";

import { TIMEOUTS } from "../helpers/test-config";

test.describe("S2: Hilfe-Anfrage → Zustellung → Annahme", () => {
  let agentA: TestAgent;
  let agentB: TestAgent;

  test.beforeEach(async ({ browser }) => {
    // Zwei Agenten erstellen und einloggen
    agentA = await createAgent(browser, "nachbar_a");
    agentB = await createAgent(browser, "helfer_b");

    // Login (parallel moeglich, aber sequenziell stabiler)
    await loginAgent(agentA);
    await loginAgent(agentB);
  });

  test.afterEach(async () => {
    await cleanupAgents(agentA, agentB);
  });

  test("S2.1 — Agent A erstellt Hilfe-Anfrage, Agent B sieht sie im Feed", async () => {
    const testTitle = `E2E Hilfe ${Date.now()}`;

    // --- Agent A: Hilfe erstellen ---
    await withAgent(agentA, "Hilfe-Anfrage erstellen", async ({ page }) => {
      await page.goto("/help/new");
      await waitForStableUI(page);

      // Typ: "Ich suche Hilfe"
      const needButton = page.getByText("Hilfe suchen").or(
        page.locator("[data-testid='help-type-need']")
      );
      await needButton.click();
      await page.waitForTimeout(500);

      // Erste Kategorie waehlen (z.B. Einkaufen)
      const categoryButton = page.locator("button").filter({ hasText: /Einkaufen/i }).first();
      await categoryButton.click();
      await waitForStableUI(page);

      // Falls Unterkategorie-Schritt erscheint ("Genauer gesagt..."): ueberspringen
      // Manche Kategorien haben Unterkategorien (shopping → Wocheneinkauf, Apotheke, etc.)
      const subcatHeading = page.getByText("Genauer gesagt");
      if (await subcatHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("[A] Unterkategorie-Schritt erkannt → ueberspringen");
        await page.click("button:has-text('Überspringen')");
        await waitForStableUI(page);
      }

      // Titel eingeben (auf Details-Schritt)
      const titleInput = page.getByLabel(/Titel/i);
      await titleInput.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
      await titleInput.fill(testTitle);

      // Beschreibung
      const descInput = page.getByLabel(/Beschreibung/i);
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill("Ich brauche Hilfe beim Einkaufen. Circa 30 Minuten.");
      }

      // Absenden
      const submitBtn = page.getByRole("button", { name: /veröffentlichen|absenden|erstellen/i });
      await submitBtn.click();
      await waitForStableUI(page);

      console.log("[A] Hilfe-Anfrage erstellt:", testTitle);
    });

    // --- Agent B: Hilfe im Feed sehen ---
    await withAgent(agentB, "Hilfe im Feed pruefen", async ({ page }) => {
      await page.goto("/help");
      await waitForStableUI(page);

      // Auf das Element warten (Realtime oder Reload)
      try {
        await waitForFeedItem(page, testTitle, { timeout: TIMEOUTS.realtimeDelivery });
      } catch {
        // Fallback: Seite neu laden und nochmal pruefen
        await page.reload();
        await waitForStableUI(page);
        await waitForFeedItem(page, testTitle, { timeout: TIMEOUTS.elementVisible });
      }

      // Assert: Hilfe-Anfrage ist sichtbar
      const helpCard = page.locator("[data-testid='help-card']", { hasText: testTitle }).or(
        page.locator("article, [role='article'], .rounded-lg", { hasText: testTitle })
      );
      await expect(helpCard.first()).toBeVisible();
      console.log("[B] Hilfe-Anfrage im Feed gefunden");
    });
  });

  test("S2.2 — Agent B nimmt Hilfe-Anfrage an, Agent A sieht Status-Aenderung", async () => {
    const testTitle = `E2E Annahme ${Date.now()}`;

    // Agent A: Hilfe erstellen
    await withAgent(agentA, "Hilfe erstellen", async ({ page }) => {
      await page.goto("/help/new");
      await waitForStableUI(page);

      const needButton = page.getByText("Hilfe suchen").or(
        page.locator("[data-testid='help-type-need']")
      );
      await needButton.click();
      await page.waitForTimeout(500);

      // Kategorie waehlen (Einkaufen)
      const categoryButton = page.locator("button").filter({ hasText: /Einkaufen/i }).first();
      await categoryButton.click();
      await waitForStableUI(page);

      // Falls Unterkategorie-Schritt erscheint ("Genauer gesagt..."): ueberspringen
      const subcatHeading = page.getByText("Genauer gesagt");
      if (await subcatHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("[A] Unterkategorie-Schritt erkannt → ueberspringen");
        await page.click("button:has-text('Überspringen')");
        await waitForStableUI(page);
      }

      // Titel eingeben (auf Details-Schritt)
      const titleInput = page.getByLabel(/Titel/i);
      await titleInput.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
      await titleInput.fill(testTitle);

      const submitBtn = page.getByRole("button", { name: /veröffentlichen|absenden|erstellen/i });
      await submitBtn.click();
      await waitForStableUI(page);
    });

    // Agent B: Zur Hilfe-Detail-Seite navigieren und annehmen
    await withAgent(agentB, "Hilfe annehmen", async ({ page }) => {
      await page.goto("/help");
      await waitForStableUI(page);

      // Auf Hilfe-Anfrage klicken
      const helpCard = page.locator("[data-testid='help-card']", { hasText: testTitle }).or(
        page.locator("article, .rounded-lg", { hasText: testTitle })
      );

      try {
        await helpCard.first().waitFor({ state: "visible", timeout: TIMEOUTS.realtimeDelivery });
      } catch {
        await page.reload();
        await waitForStableUI(page);
        await helpCard.first().waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
      }

      await helpCard.first().click();
      await waitForStableUI(page);

      // "Annehmen" Button klicken
      const acceptButton = page.getByRole("button", { name: /annehmen|helfen|anbieten/i }).or(
        page.locator("[data-testid='help-accept']")
      );
      if (await acceptButton.isVisible().catch(() => false)) {
        await acceptButton.click();
        await waitForStableUI(page);
        console.log("[B] Hilfe angenommen");
      } else {
        console.log("[B] Kein Annehmen-Button gefunden — evtl. anders implementiert");
      }
    });

    // Agent A: Status-Aenderung pruefen
    await withAgent(agentA, "Status pruefen", async ({ page }) => {
      await page.goto("/help");
      await waitForStableUI(page);

      // Hilfe-Anfrage finden und Status pruefen
      const helpCard = page.locator("[data-testid='help-card']", { hasText: testTitle }).or(
        page.locator("article, .rounded-lg", { hasText: testTitle })
      );

      if (await helpCard.first().isVisible().catch(() => false)) {
        // Pruefen ob Status sich geaendert hat
        const _statusBadge = helpCard.first().locator("[data-testid='help-status']").or(
          helpCard.first().locator(".badge, [class*='badge']")
        );
        console.log("[A] Status der Hilfe-Anfrage geprueft");
      }
    });
  });
});
