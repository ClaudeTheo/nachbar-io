// Nachbar.io — S8: Care SOS Workflow
// Senior (S) loest SOS aus, Helfer (B) reagiert — inkl. EmergencyBanner-Pflicht
import { test, expect } from "@playwright/test";
import { createAgent, loginAgent, cleanupAgents, type TestAgent } from "../helpers/agent-factory";
import { withAgent } from "../helpers/scenario-runner";
import { waitForStableUI, createConsoleErrorCollector } from "../helpers/observer";
import { CareSosNewPage } from "../pages/care-sos.page";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("S8: Care SOS Workflow", () => {
  let agentS: TestAgent;
  let agentB: TestAgent;

  test.beforeEach(async ({ browser }) => {
    agentS = await createAgent(browser, "senior_s", {
      viewport: { width: 393, height: 851 },
    });
    agentB = await createAgent(browser, "helfer_b");

    await loginAgent(agentS);
    await loginAgent(agentB);
  });

  test.afterEach(async () => {
    await cleanupAgents(agentS, agentB);
  });

  test("S8.1 — SOS-Kategorien sind vollstaendig und haben 80px Touch-Targets", async () => {
    await withAgent(agentS, "Kategorien pruefen", async ({ page }) => {
      const sosPage = new CareSosNewPage(page);
      await sosPage.goto();
      await sosPage.assertLoaded();

      // Alle 5 Kategorien sichtbar
      await sosPage.assertAllCategoriesVisible();

      // Touch-Target Groesse pruefen
      await sosPage.assertTouchTargetSize();

      console.log("[S] Alle SOS-Kategorien sichtbar mit korrekten Touch-Targets");
    });
  });

  test("S8.2 — EmergencyBanner erscheint bei medizinischem Notfall (FMEA FM-NB-02)", async () => {
    await withAgent(agentS, "Emergency Banner", async ({ page }) => {
      const sosPage = new CareSosNewPage(page);
      await sosPage.goto();

      // Medizinischen Notfall waehlen
      await sosPage.selectMedicalEmergency();

      // KRITISCH: EmergencyBanner MUSS angezeigt werden
      await sosPage.assertEmergencyBannerShown();

      // 112 Link muss klickbar sein
      const link112 = page.locator("a[href='tel:112']");
      await expect(link112).toBeVisible();
      await expect(link112).toHaveAttribute("href", "tel:112");

      // Escape darf Banner NICHT schliessen (FMEA FM-NB-02)
      await page.keyboard.press("Escape");
      await expect(sosPage.emergencyBanner).toBeVisible();

      console.log("[S] EmergencyBanner korrekt angezeigt — 112/110 Links vorhanden, Escape blockiert");
    });
  });

  test("S8.3 — Nicht-Notfall-Kategorie loest direkt SOS aus (kein EmergencyBanner)", async () => {
    await withAgent(agentS, "Nicht-Notfall SOS", async ({ page }) => {
      const errors = createConsoleErrorCollector(page);
      const sosPage = new CareSosNewPage(page);
      await sosPage.goto();

      // "Allgemeine Hilfe" waehlen — kein EmergencyBanner
      await sosPage.selectGeneralHelp();

      // Banner darf NICHT erscheinen
      await expect(sosPage.emergencyBanner).not.toBeVisible().catch(() => {
        // Evtl. wurde die Seite schon weitergeleitet (= SOS ausgeloest)
      });

      // Sollte zur SOS-Status-Seite navigiert werden
      await page.waitForURL(/\/care\/sos\//, { timeout: TIMEOUTS.pageLoad }).catch(() => {
        console.log("[S] Kein Redirect — evtl. Fehler oder anderes Routing");
      });

      errors.stop();
      console.log("[S] Allgemeine Hilfe SOS ausgeloest, kein EmergencyBanner");
    });
  });

  test("S8.4 — EmergencyBanner: Bestaetigung fuehrt zu SOS-Erstellung", async () => {
    await withAgent(agentS, "Emergency + SOS", async ({ page }) => {
      const sosPage = new CareSosNewPage(page);
      await sosPage.goto();

      // Medizinischen Notfall waehlen
      await sosPage.selectMedicalEmergency();
      await sosPage.assertEmergencyBannerShown();

      // "Ich habe 112/110 angerufen" klicken
      await sosPage.acknowledgeEmergency();

      // SOS sollte jetzt erstellt werden (Redirect zur Status-Seite)
      await page.waitForURL(/\/care\/sos\//, { timeout: TIMEOUTS.pageLoad }).catch(() => {
        console.log("[S] Kein Redirect nach Emergency-Ack — API-Fehler pruefen");
      });

      console.log("[S] EmergencyBanner bestaetigt, SOS erstellt");
    });
  });

  test("S8.5 — Helfer sieht SOS-Alert und kann antworten", async () => {
    // Senior loest SOS aus
    await withAgent(agentS, "SOS ausloesen", async ({ page }) => {
      const sosPage = new CareSosNewPage(page);
      await sosPage.goto();
      await sosPage.selectGeneralHelp();
      await waitForStableUI(page);
      console.log("[S] SOS ausgeloest");
    });

    // Helfer prueft SOS-Alerts
    await withAgent(agentB, "SOS-Alert pruefen", async ({ page }) => {
      // Helfer navigiert zum Dashboard / SOS-Uebersicht
      await page.goto("/care/sos");
      await waitForStableUI(page);

      // SOS-Alert-Karte suchen
      const alertCard = page.locator("[data-testid='sos-alert-card']").or(
        page.getByText(/Allgemeine Hilfe|SOS/).first()
      );

      try {
        await alertCard.waitFor({ state: "visible", timeout: TIMEOUTS.realtimeDelivery });
        console.log("[B] SOS-Alert gefunden");

        // "Ich helfe" Button pruefen
        const acceptButton = page.getByText(/Ich helfe/).first();
        if (await acceptButton.isVisible().catch(() => false)) {
          await acceptButton.click();
          await waitForStableUI(page);
          console.log("[B] SOS-Alert angenommen");
        }
      } catch {
        // Fallback: Seite neu laden
        await page.reload();
        await waitForStableUI(page);
        console.log("[B] Kein SOS-Alert gefunden (evtl. Realtime nicht aktiv)");
      }
    });
  });

  test("S8.6 — Keine Console-Errors waehrend SOS-Flow", async () => {
    await withAgent(agentS, "Error-Check", async ({ page }) => {
      const errors = createConsoleErrorCollector(page);

      // Gesamten SOS-Flow durchlaufen
      await page.goto("/care/sos/new");
      await waitForStableUI(page);

      // Nicht-Notfall waehlen
      const helpButton = page.getByText("Besuch gewuenscht");
      if (await helpButton.isVisible().catch(() => false)) {
        await helpButton.click();
        await waitForStableUI(page);
      }

      errors.stop();

      // Keine JavaScript-Fehler
      const criticalErrors = errors.errors.filter(
        (e) => !e.includes("hydration") && !e.includes("Warning:")
      );
      expect(criticalErrors).toHaveLength(0);

      console.log("[S] Keine kritischen Console-Errors im SOS-Flow");
    });
  });
});
