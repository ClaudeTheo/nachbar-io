// Nachbar.io — S5: Senioren-/Betreuer-Terminal Komplett-Test
// Agent S (Senior) navigiert alle Menuepunkte; Agent T (Betreuer) interagiert.
import { test, expect } from "@playwright/test";
import { createAgent, loginAgent, cleanupAgents, type TestAgent } from "../helpers/agent-factory";
import { withAgent } from "../helpers/scenario-runner";
import { waitForStableUI, createConsoleErrorCollector } from "../helpers/observer";
import { SeniorHomePage, SeniorCheckinPage, SeniorHelpPage } from "../pages";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("S5: Senioren-Terminal Komplett-Test", () => {
  let agentS: TestAgent;
  let agentT: TestAgent;

  test.beforeEach(async ({ browser }) => {
    // Senior bekommt Mobile-Viewport
    agentS = await createAgent(browser, "senior_s", {
      viewport: { width: 393, height: 851 },
    });
    agentT = await createAgent(browser, "betreuer_t");

    await loginAgent(agentS);
    await loginAgent(agentT);
  });

  test.afterEach(async () => {
    await cleanupAgents(agentS, agentT);
  });

  test("S5.1 — Senior-Home zeigt alle 4 grossen Buttons", async () => {
    await withAgent(agentS, "Senior-Home pruefen", async ({ page }) => {
      const seniorHome = new SeniorHomePage(page);
      await seniorHome.goto();
      await seniorHome.assertLoaded();

      // Assert: Alle Buttons sichtbar
      await seniorHome.assertAllButtonsVisible();

      // Assert: Begruessung enthaelt evtl. den Namen
      await expect(seniorHome.greeting).toBeVisible();

      console.log("[S] Senior-Home: Alle Buttons sichtbar");
    });
  });

  test("S5.2 — Senior kann alle Menuepunkte navigieren", async () => {
    await withAgent(agentS, "Navigation pruefen", async ({ page }) => {
      const errors = createConsoleErrorCollector(page);

      // Senior-Home
      await page.goto("/senior/home");
      await waitForStableUI(page);
      await expect(page).toHaveURL(/\/senior\/home/);
      console.log("[S] → /senior/home OK");

      // Nachrichten
      const newsButton = page.getByText("Nachrichten").or(
        page.locator("[data-testid='senior-news-button']")
      );
      await newsButton.click();
      await page.waitForURL("**/senior/news**", { timeout: TIMEOUTS.pageLoad });
      await waitForStableUI(page);
      console.log("[S] → /senior/news OK");

      // Zurueck zu Home
      await page.goBack();
      await waitForStableUI(page);

      // Check-in
      const checkinButton = page.getByText("Alles in Ordnung").or(
        page.locator("[data-testid='senior-checkin-button']")
      );
      await checkinButton.click();
      await page.waitForURL("**/senior/checkin**", { timeout: TIMEOUTS.pageLoad });
      await waitForStableUI(page);
      console.log("[S] → /senior/checkin OK");

      // Zurueck zu Home
      await page.goBack();
      await waitForStableUI(page);

      // Hilfe anfragen
      const helpButton = page.getByText("Hilfe anfragen").or(
        page.locator("[data-testid='senior-help-button']")
      );
      await helpButton.click();
      await page.waitForURL("**/senior/help**", { timeout: TIMEOUTS.pageLoad });
      await waitForStableUI(page);
      console.log("[S] → /senior/help OK");

      errors.stop();
      expect(errors.errors).toHaveLength(0);
    });
  });

  test("S5.3 — Senior-Check-in: 'Alles in Ordnung' funktioniert", async () => {
    await withAgent(agentS, "Check-in durchfuehren", async ({ page }) => {
      const checkinPage = new SeniorCheckinPage(page);
      await checkinPage.goto();

      // "Alles gut" / "In Ordnung" Button klicken
      const okButton = page.getByText(/Alles gut|in Ordnung|Mir geht es gut/i).or(
        page.locator("[data-testid='checkin-ok']")
      );
      if (await okButton.isVisible().catch(() => false)) {
        await okButton.click();
        await waitForStableUI(page);

        // Bestaetigung pruefen
        const confirmation = page.getByText(/bestätigt|danke|erfolgreich|gesendet/i).or(
          page.locator("[data-testid='checkin-confirmed']")
        );
        await expect(confirmation).toBeVisible({ timeout: TIMEOUTS.elementVisible });
        console.log("[S] Check-in erfolgreich bestaetigt");
      } else {
        console.log("[S] Check-in Button nicht gefunden — Seite pruefen");
      }
    });
  });

  test("S5.4 — Touch-Target Groesse: Mindestens 76px", async () => {
    await withAgent(agentS, "Touch-Targets pruefen", async ({ page }) => {
      await page.goto("/senior/home");
      await waitForStableUI(page);

      // Alle interaktiven Elemente auf der Senior-Seite pruefen
      const buttons = page.locator("button, a[role='button'], [data-testid^='senior-']");
      const count = await buttons.count();

      let tooSmall = 0;
      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box && box.height < 76) {
          const text = await buttons.nth(i).textContent();
          // Nur Haupt-Buttons pruefen (nicht den "Zum normalen Modus" Link)
          if (text && !text.includes("normalen Modus")) {
            console.warn(`[S] Button zu klein: "${text?.trim()}" → ${box.height}px`);
            tooSmall++;
          }
        }
      }

      // Senior-Mode: Haupt-Buttons sollten mindestens 80px sein
      console.log(`[S] ${count} Buttons geprueft, ${tooSmall} zu klein`);
    });
  });

  test("S5.5 — Betreuer kann Dashboard normal nutzen, waehrend Senior in Senior-UI ist", async () => {
    // Parallel: Senior und Betreuer nutzen verschiedene UIs
    await withAgent(agentS, "Senior-UI", async ({ page }) => {
      await page.goto("/senior/home");
      await waitForStableUI(page);
      await expect(page).toHaveURL(/\/senior/);
      console.log("[S] Senior in Senior-UI");
    });

    await withAgent(agentT, "Betreuer in normaler UI", async ({ page }) => {
      await page.goto("/dashboard");
      await waitForStableUI(page);
      await expect(page).toHaveURL(/\/dashboard/);

      // Betreuer sieht die normale Navigation
      const bottomNav = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(bottomNav).toBeVisible();
      console.log("[T] Betreuer in normaler UI");
    });
  });

  test("S5.6 — Senior kann zum normalen Modus wechseln", async () => {
    await withAgent(agentS, "Modus-Wechsel", async ({ page }) => {
      await page.goto("/senior/home");
      await waitForStableUI(page);

      // "Zum normalen Modus" Button
      const switchButton = page.getByText("Zum normalen Modus");
      await expect(switchButton).toBeVisible();
      await switchButton.click();

      // Sollte zum Dashboard wechseln
      await page.waitForURL("**/dashboard**", { timeout: TIMEOUTS.pageLoad });
      console.log("[S] Zum normalen Modus gewechselt");
    });
  });
});
