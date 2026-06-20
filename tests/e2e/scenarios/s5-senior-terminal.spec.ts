// Nachbar.io — S5: Senioren-Shell Komplett-Test
// Agent S (Senior) navigiert die kanonische (senior)-Shell; Agent T nutzt parallel die normale UI.
import { test, expect } from "@playwright/test";
import {
  createAgent,
  loginAgent,
  cleanupAgents,
  type TestAgent,
} from "../helpers/agent-factory";
import { withAgent } from "../helpers/scenario-runner";
import { waitForStableUI } from "../helpers/observer";
import { SeniorHomePage, SeniorCheckinPage, SeniorHelpPage } from "../pages";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("S5: Senioren-Shell Komplett-Test", () => {
  let agentS: TestAgent;
  let agentT: TestAgent;

  test.beforeEach(async ({ browser }) => {
    agentS = await createAgent(browser, "senior_s", {
      viewport: { width: 393, height: 851 },
      useStorageState: true,
    });
    agentT = await createAgent(browser, "betreuer_t", {
      useStorageState: true,
    });

    const fs = await import("fs");
    const { authFile } = await import("../helpers/auth-paths");
    if (!fs.existsSync(authFile("senior_s"))) {
      await loginAgent(agentS);
    }
    if (!fs.existsSync(authFile("betreuer_t"))) {
      await loginAgent(agentT);
    }
  });

  test.afterEach(async () => {
    await cleanupAgents(agentS, agentT);
  });

  test("S5.1 — Kreis-Start zeigt die 4 kanonischen Kacheln", async () => {
    await withAgent(agentS, "Kreis-Start pruefen", async ({ page }) => {
      const seniorHome = new SeniorHomePage(page);
      await seniorHome.goto();

      await seniorHome.assertAllTilesVisible();
      await seniorHome.assertTileTargets();

      console.log("[S] Kreis-Start: 4 Kacheln sichtbar");
    });
  });

  test("S5.2 — Senior kann die kanonischen Ziele erreichen", async () => {
    await withAgent(agentS, "Navigation pruefen", async ({ page }) => {
      const seniorHome = new SeniorHomePage(page);

      await seniorHome.goto();
      await seniorHome.clickMeinKreis();
      await expect(page).toHaveURL(/\/mein-kreis/);
      await expect(page.locator("main")).toBeVisible({
        timeout: TIMEOUTS.elementVisible,
      });
      console.log("[S] → /mein-kreis OK");

      await seniorHome.goto();
      await seniorHome.clickHierBeiMir();
      await expect(page).toHaveURL(/\/hier-bei-mir/);
      await expect(
        page.getByRole("heading", { name: /Hier bei mir/i }),
      ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
      console.log("[S] → /hier-bei-mir OK");

      await seniorHome.goto();
      await seniorHome.clickSchreiben();
      await expect(page).toHaveURL(/\/schreiben/);
      await expect(page.locator("main")).toBeVisible({
        timeout: TIMEOUTS.elementVisible,
      });
      console.log("[S] → /schreiben OK");

      await seniorHome.goto();
      await seniorHome.clickSos();
      const sosPage = new SeniorHelpPage(page);
      await sosPage.assertLoaded();
      console.log("[S] → /sos OK");

      const checkinPage = new SeniorCheckinPage(page);
      await checkinPage.goto();
      await checkinPage.assertLoaded();
      console.log("[S] → /checkin OK");
    });
  });

  test("S5.3 — Senior-Check-in: 'Mir geht es gut' funktioniert", async () => {
    await withAgent(agentS, "Check-in durchfuehren", async ({ page }) => {
      const checkinPage = new SeniorCheckinPage(page);
      await checkinPage.goto();
      await checkinPage.assertLoaded();

      await checkinPage.checkinOk();
      await checkinPage.assertCheckinConfirmed();

      console.log("[S] Check-in erfolgreich bestaetigt");
    });
  });

  test("S5.4 — Touch-Targets: kanonische Senior-Shell mindestens 76px", async () => {
    await withAgent(agentS, "Touch-Targets pruefen", async ({ page }) => {
      const seniorHome = new SeniorHomePage(page);
      await seniorHome.goto();
      await seniorHome.assertTouchTargetSize();

      console.log("[S] Kreis-Start Touch-Targets geprueft");
    });
  });

  test("S5.5 — Betreuer nutzt normale UI, waehrend Senior in der Senior-Shell ist", async () => {
    await withAgent(agentS, "Senior-Shell", async ({ page }) => {
      const seniorHome = new SeniorHomePage(page);
      await seniorHome.goto();
      await seniorHome.assertLoaded();
      console.log("[S] Senior in kanonischer Shell");
    });

    await withAgent(agentT, "Betreuer in normaler UI", async ({ page }) => {
      await page.goto("/dashboard");
      await waitForStableUI(page);
      await expect(page).toHaveURL(/\/dashboard/);

      const bottomNav = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(bottomNav).toBeVisible();
      console.log("[T] Betreuer in normaler UI");
    });
  });
});
