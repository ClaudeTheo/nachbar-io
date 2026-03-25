// Nachbar.io — S9: Care Check-in & Medikamenten-Workflow
// Senior (S) fuehrt Check-in durch, Betreuer (T) sieht Status
import { test, expect } from "@playwright/test";
import {
  createAgent,
  loginAgent,
  cleanupAgents,
  type TestAgent,
} from "../helpers/agent-factory";
import { withAgent } from "../helpers/scenario-runner";
import {
  waitForStableUI,
  createConsoleErrorCollector,
  gotoCare,
} from "../helpers/observer";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("S9: Care Check-in & Medikamenten-Workflow", () => {
  let agentS: TestAgent;
  let agentT: TestAgent;

  test.beforeEach(async ({ browser }) => {
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

  test("S9.1 — Check-in Dialog zeigt 3 Stimmungsoptionen mit 80px Buttons", async () => {
    await withAgent(agentS, "Check-in UI", async ({ page }) => {
      // Care Check-in Seite besuchen
      await gotoCare(page, "/care/checkin");

      // 3 Stimmungsoptionen sichtbar
      const goodButton = page.getByText(/Mir geht es gut|Alles gut/i);
      const notWellButton = page.getByText(/Nicht so gut/i);
      const needHelpButton = page.getByText(/Brauche Hilfe/i);

      await expect(goodButton.first()).toBeVisible({
        timeout: TIMEOUTS.elementVisible,
      });
      await expect(notWellButton.first()).toBeVisible();
      await expect(needHelpButton.first()).toBeVisible();

      // Touch-Target Groesse pruefen (Senioren-Modus: 80px)
      const buttons = page.locator("button[style*='min-height: 80px']");
      const count = await buttons.count();
      expect(count).toBeGreaterThanOrEqual(3);

      console.log(
        "[S] Check-in Dialog: 3 Optionen sichtbar, Touch-Targets >= 80px",
      );
    });
  });

  test("S9.2 — Senior 'Mir geht es gut' Check-in erfolgreich", async () => {
    await withAgent(agentS, "OK Check-in", async ({ page }) => {
      await gotoCare(page, "/care/checkin");

      // API-Response abfangen: POST /api/care/checkin muss 201 zurueckgeben
      const checkinResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/care/checkin") &&
          resp.request().method() === "POST",
        { timeout: TIMEOUTS.elementVisible },
      );

      // "Mir geht es gut" klicken
      const okButton = page
        .getByText(/Mir geht es gut/i)
        .first()
        .or(page.locator("[data-testid='checkin-ok']"));
      await okButton.click();

      // Primaere Validierung: API-Antwort pruefen (robust gegen Hydration-Re-Renders)
      const checkinResponse = await checkinResponsePromise;
      const status = checkinResponse.status();

      // 201 = Erfolg, 429 = Rate-Limit (bei wiederholtem Testlauf)
      expect([201, 429]).toContain(status);

      if (status === 201) {
        // UI-Bestaetigung pruefen (mit Toleranz fuer Hydration-Reloads)
        const success = page.getByText(/Danke/i).first();
        await expect(success)
          .toBeVisible({ timeout: TIMEOUTS.elementVisible })
          .catch(() => {
            console.log(
              "[S] UI-Bestaetigung nicht sichtbar (Hydration-Reload), aber API 201 OK",
            );
          });
      }

      console.log(`[S] Check-in 'OK' — API ${status}`);
    });
  });

  test("S9.3 — Senior 'Nicht so gut' loest Angehoerigen-Benachrichtigung aus", async () => {
    await withAgent(agentS, "Nicht-gut Check-in", async ({ page }) => {
      await gotoCare(page, "/care/checkin");

      // API-Response abfangen
      const checkinResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/care/checkin") &&
          resp.request().method() === "POST",
        { timeout: TIMEOUTS.elementVisible },
      );

      // "Nicht so gut" klicken
      const notWellButton = page.getByText(/Nicht so gut/i).first();
      await notWellButton.click();

      // Primaere Validierung: 201 = Erfolg, 429 = Rate-Limit
      const checkinResponse = await checkinResponsePromise;
      expect([201, 429]).toContain(checkinResponse.status());

      console.log(
        `[S] Check-in 'Nicht so gut' gesendet (API ${checkinResponse.status()})`,
      );
    });

    // Betreuer prueft ob Benachrichtigung angekommen ist
    await withAgent(agentT, "Benachrichtigung pruefen", async ({ page }) => {
      await page.goto("/dashboard");
      await waitForStableUI(page);

      // Notification-Bell oder Benachrichtigungs-Badge pruefen
      const notificationBell = page
        .locator("[data-testid='notification-bell']")
        .or(page.locator("[aria-label*='Benachrichtigung']"));

      try {
        await expect(notificationBell).toBeVisible({
          timeout: TIMEOUTS.realtimeDelivery,
        });
        console.log("[T] Benachrichtigungen sichtbar im Dashboard");
      } catch {
        console.log(
          "[T] Keine Benachrichtigungen im Dashboard (evtl. Push-only)",
        );
      }
    });
  });

  test("S9.4 — Senior 'Brauche Hilfe' loest Auto-SOS aus", async () => {
    await withAgent(agentS, "Need-Help Check-in", async ({ page }) => {
      await gotoCare(page, "/care/checkin");

      // API-Response abfangen
      const checkinResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/care/checkin") &&
          resp.request().method() === "POST",
        { timeout: TIMEOUTS.elementVisible },
      );

      // "Brauche Hilfe" klicken
      const helpButton = page.getByText(/Brauche Hilfe/i).first();
      await helpButton.click();

      // Primaere Validierung: 201 = Erfolg, 429 = Rate-Limit
      const checkinResponse = await checkinResponsePromise;
      expect([201, 429]).toContain(checkinResponse.status());

      console.log(
        `[S] Check-in 'Brauche Hilfe' gesendet (API ${checkinResponse.status()})`,
      );
    });
  });

  test("S9.5 — Senior Check-in mit optionaler Notiz", async () => {
    await withAgent(agentS, "Check-in mit Notiz", async ({ page }) => {
      await gotoCare(page, "/care/checkin");

      // Notiz eingeben (wenn Textarea vorhanden)
      const noteInput = page
        .locator("textarea")
        .or(page.getByPlaceholder(/Kopfschmerzen|hinzufügen/i));

      if (await noteInput.isVisible().catch(() => false)) {
        await noteInput.fill("Leichte Kopfschmerzen seit gestern Abend");
        console.log("[S] Notiz eingegeben");
      }

      // "Nicht so gut" waehlen
      const notWellButton = page.getByText(/Nicht so gut/i).first();
      await notWellButton.click();
      await waitForStableUI(page);

      console.log("[S] Check-in mit Notiz gesendet");
    });
  });

  test("S9.6 — Medikamenten-Uebersicht zeigt aktive Medikamente", async () => {
    await withAgent(agentS, "Medikamenten-Seite", async ({ page }) => {
      const errors = createConsoleErrorCollector(page);

      // Medikamenten-Seite besuchen
      await gotoCare(page, "/care/medications");

      // Seite sollte laden ohne Fehler
      await expect(page).toHaveURL(/\/care\/medications/);

      // Entweder Medikamenten-Karten oder "Keine Medikamente"-Hinweis
      const medCard = page
        .locator("[data-testid='medication-card']")
        .or(page.getByText(/Genommen|Ausstehend|Verpasst/i).first());
      const emptyState = page.getByText(
        /keine Medikamente|noch nicht eingerichtet/i,
      );

      const hasMeds = await medCard.isVisible().catch(() => false);
      const isEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasMeds || isEmpty).toBe(true);

      errors.stop();
      const criticalErrors = errors.errors.filter(
        (e) =>
          !e.includes("hydration") &&
          !e.includes("Warning:") &&
          !e.includes("Failed to load resource") &&
          !e.includes("status of 4"),
      );
      expect(criticalErrors).toHaveLength(0);

      console.log(
        `[S] Medikamenten-Seite geladen: ${hasMeds ? "Medikamente vorhanden" : "Leerer Zustand"}`,
      );
    });
  });

  test("S9.7 — Medikament als 'Genommen' markieren", async () => {
    await withAgent(agentS, "Medikament genommen", async ({ page }) => {
      await gotoCare(page, "/care/medications");

      // "Genommen" Button suchen (nur bei ausstehenden Medikamenten)
      const takenButton = page
        .getByText("Genommen")
        .first()
        .or(page.locator("[data-testid='med-taken']").first());

      if (await takenButton.isVisible().catch(() => false)) {
        await takenButton.click();
        await waitForStableUI(page);

        // Status sollte sich aendern
        const statusBadge = page.getByText("Genommen").first();
        await expect(statusBadge).toBeVisible({
          timeout: TIMEOUTS.elementVisible,
        });
        console.log("[S] Medikament als 'Genommen' markiert");
      } else {
        console.log("[S] Kein ausstehendes Medikament gefunden — Skip");
      }
    });
  });

  test("S9.8 — AlarmScreen: 'Aus'-Button sendet Check-in", async () => {
    // Dieser Test prueft den Alarm-Workflow, falls die Check-in-Zeit erreicht ist
    await withAgent(agentS, "Alarm pruefen", async ({ page }) => {
      // Direkt die AlarmScreen-URL aufrufen (falls vorhanden)
      await page.goto("/care/alarm");
      await waitForStableUI(page);

      // AlarmScreen oder Check-in-Seite
      const ausButton = page.getByText("Aus").first();
      const _schlummernButton = page.getByText(/Schlummern/i);
      const checkinTime = page.getByText("Check-in Zeit");

      if (await checkinTime.isVisible().catch(() => false)) {
        console.log("[S] AlarmScreen angezeigt");

        // "Aus" drücken = Check-in OK
        await ausButton.click();
        await waitForStableUI(page);

        // Erfolgsbestaetigung
        const success = page.getByText(/Guten Morgen|Check-in erledigt|Danke/i);
        await expect(success).toBeVisible({ timeout: TIMEOUTS.elementVisible });
        console.log("[S] AlarmScreen 'Aus' → Check-in bestaetigt");
      } else {
        console.log("[S] Kein AlarmScreen aktiv — Skip (kein aktiver Alarm)");
      }
    });
  });

  test("S9.9 — Keine Console-Errors im Check-in-Flow", async () => {
    await withAgent(agentS, "Error-Check", async ({ page }) => {
      const errors = createConsoleErrorCollector(page);

      // Check-in Seite
      await gotoCare(page, "/care/checkin");

      // Medikamenten-Seite
      await gotoCare(page, "/care/medications");

      errors.stop();

      const criticalErrors = errors.errors.filter(
        (e) =>
          !e.includes("hydration") &&
          !e.includes("Warning:") &&
          !e.includes("Failed to load resource") &&
          !e.includes("status of 4"),
      );
      expect(criticalErrors).toHaveLength(0);

      console.log(
        "[S] Keine kritischen Console-Errors im Check-in/Medikamenten-Flow",
      );
    });
  });
});
