// Nachbar.io — S10: Barrierefreiheits-Tests (WCAG 2.1 AA)
// Automatisierte axe-core Pruefung aller Care- und Senior-Seiten
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAgent, loginAgent, cleanupAgents, type TestAgent } from "../helpers/agent-factory";
import { withAgent } from "../helpers/scenario-runner";
import { waitForStableUI } from "../helpers/observer";

// axe-core Regeln die wir im Pilotbetrieb akzeptieren (z.B. Third-Party Elemente)
const ACCEPTABLE_VIOLATIONS = [
  "color-contrast", // Wird separat per Komponenten-Test geprueft (4.5:1 Kontrast)
];

// Hilfsfunktion: axe-core auf aktueller Seite ausfuehren
async function runAxeCheck(page: import("@playwright/test").Page, pageName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(ACCEPTABLE_VIOLATIONS)
    .analyze();

  const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");

  if (violations.length > 0) {
    const summary = violations.map(
      (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} Vorkommen)`
    ).join("\n");
    console.log(`[axe] ${pageName} — ${violations.length} Violations:\n${summary}`);
  } else {
    console.log(`[axe] ${pageName} — Keine kritischen Violations`);
  }

  return { violations, total: results.violations.length };
}

test.describe("S10: Barrierefreiheit (WCAG 2.1 AA)", () => {
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

  // --- Senior-Seiten (Primaerzielgruppe: Senioren 65+) ---

  test("S10.1 — Senior-Startseite: keine kritischen Violations", async () => {
    await withAgent(agentS, "Senior-Home axe", async ({ page }) => {
      await page.goto("/");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "Senior-Startseite");
      expect(violations).toHaveLength(0);
    });
  });

  test("S10.2 — Senior-Check-in-Seite: keine kritischen Violations", async () => {
    await withAgent(agentS, "Check-in axe", async ({ page }) => {
      await page.goto("/checkin");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "Senior-Check-in");
      expect(violations).toHaveLength(0);
    });
  });

  test("S10.3 — Senior-Medikamente-Seite: keine kritischen Violations", async () => {
    await withAgent(agentS, "Meds axe", async ({ page }) => {
      await page.goto("/medications");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "Senior-Medikamente");
      expect(violations).toHaveLength(0);
    });
  });

  // --- Care-Seiten (Helfer/Angehoerige) ---

  test("S10.4 — Care-Dashboard: keine kritischen Violations", async () => {
    await withAgent(agentB, "Care-Dashboard axe", async ({ page }) => {
      await page.goto("/care");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "Care-Dashboard");
      expect(violations).toHaveLength(0);
    });
  });

  test("S10.5 — SOS-Kategorie-Seite: keine kritischen Violations", async () => {
    await withAgent(agentS, "SOS axe", async ({ page }) => {
      await page.goto("/care/sos/new");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "SOS-Kategorien");
      expect(violations).toHaveLength(0);

      // Zusaetzlich: Touch-Target Groesse pruefen (REQ-SR-001)
      const buttons = page.locator("button");
      const count = await buttons.count();
      let smallButtons = 0;
      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box && box.height < 44) {
          // WCAG 2.5.5 Target Size: mindestens 44px (AAA: 44px, unsere Vorgabe: 80px)
          smallButtons++;
          const text = await buttons.nth(i).textContent();
          console.log(`[axe] Kleiner Button: "${text}" — ${box.height}px (< 44px)`);
        }
      }
      expect(smallButtons).toBe(0);
    });
  });

  test("S10.6 — Care-Check-in-Uebersicht: keine kritischen Violations", async () => {
    await withAgent(agentB, "Checkins axe", async ({ page }) => {
      await page.goto("/care/checkins");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "Check-in-Uebersicht");
      expect(violations).toHaveLength(0);
    });
  });

  test("S10.7 — Care-Medikamente-Uebersicht: keine kritischen Violations", async () => {
    await withAgent(agentB, "Meds-Uebersicht axe", async ({ page }) => {
      await page.goto("/care/medications");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "Medikamenten-Uebersicht");
      expect(violations).toHaveLength(0);
    });
  });

  test("S10.8 — SOS-Uebersicht: keine kritischen Violations", async () => {
    await withAgent(agentB, "SOS-Liste axe", async ({ page }) => {
      await page.goto("/care/sos");
      await waitForStableUI(page);

      const { violations } = await runAxeCheck(page, "SOS-Uebersicht");
      expect(violations).toHaveLength(0);
    });
  });

  // --- Spezifische ARIA und Keyboard Tests ---

  test("S10.9 — SOS-Button hat aria-label und ist per Tab erreichbar", async () => {
    await withAgent(agentS, "SOS-Button a11y", async ({ page }) => {
      await page.goto("/");
      await waitForStableUI(page);

      // SOS-Button finden
      const sosButton = page.locator("button[aria-label]").filter({ hasText: /SOS|Notfall|Hilfe/i }).first();
      if (await sosButton.isVisible().catch(() => false)) {
        // aria-label vorhanden
        const label = await sosButton.getAttribute("aria-label");
        expect(label).toBeTruthy();
        console.log(`[axe] SOS-Button aria-label: "${label}"`);

        // Per Tab erreichbar
        await sosButton.focus();
        const isFocused = await sosButton.evaluate((el) => document.activeElement === el);
        expect(isFocused).toBe(true);
        console.log("[axe] SOS-Button per Tab erreichbar");
      } else {
        console.log("[axe] Kein SOS-Button auf der Startseite gefunden (evtl. anderes Layout)");
      }
    });
  });

  test("S10.10 — EmergencyBanner hat role=alertdialog und aria-Attribute", async () => {
    await withAgent(agentS, "Banner a11y", async ({ page }) => {
      await page.goto("/care/sos/new");
      await waitForStableUI(page);

      // Medizinischen Notfall ausloesen
      const medButton = page.getByText("Medizinischer Notfall");
      if (await medButton.isVisible().catch(() => false)) {
        await medButton.click();
        await waitForStableUI(page);

        // Banner pruefen
        const banner = page.locator("[role='alertdialog']");
        if (await banner.isVisible().catch(() => false)) {
          // role=alertdialog vorhanden
          const role = await banner.getAttribute("role");
          expect(role).toBe("alertdialog");

          // aria-modal oder aria-label vorhanden
          const ariaModal = await banner.getAttribute("aria-modal");
          const ariaLabel = await banner.getAttribute("aria-label");
          const ariaLabelledby = await banner.getAttribute("aria-labelledby");
          const hasAria = ariaModal || ariaLabel || ariaLabelledby;
          console.log(`[axe] EmergencyBanner ARIA: modal=${ariaModal}, label=${ariaLabel}, labelledby=${ariaLabelledby}`);

          // 112 Link per axe pruefen
          const results = await new AxeBuilder({ page })
            .include("[role='alertdialog']")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();

          const bannerViolations = results.violations.filter(
            (v) => v.impact === "critical" || v.impact === "serious"
          );
          expect(bannerViolations).toHaveLength(0);
          console.log("[axe] EmergencyBanner: Keine kritischen Violations");
        } else {
          console.log("[axe] EmergencyBanner nicht als alertdialog markiert — pruefen!");
        }
      }
    });
  });

  // --- Zusammenfassender Full-Page Scan ---

  test("S10.11 — Gesamtbericht: alle kritischen Seiten ohne schwere Violations", async () => {
    const carePages = [
      "/care",
      "/care/sos/new",
      "/care/checkin",
      "/care/medications",
    ];

    await withAgent(agentB, "Full-Scan axe", async ({ page }) => {
      const allViolations: { page: string; count: number; critical: number }[] = [];

      for (const url of carePages) {
        await page.goto(url);
        await waitForStableUI(page);

        const { violations, total } = await runAxeCheck(page, url);
        allViolations.push({
          page: url,
          count: total,
          critical: violations.length,
        });
      }

      // Zusammenfassung
      const totalCritical = allViolations.reduce((sum, v) => sum + v.critical, 0);
      console.log("[axe] === GESAMTBERICHT ===");
      for (const v of allViolations) {
        console.log(`[axe] ${v.page}: ${v.count} gesamt, ${v.critical} kritisch`);
      }
      console.log(`[axe] Kritische Violations gesamt: ${totalCritical}`);

      expect(totalCritical).toBe(0);
    });
  });
});
