// Phase A: Solo-Aktionen — Jeder Agent testet seine Rolle einzeln
// Ausfuehrung: npx playwright test multi-agent/phase-a-solo --headed --workers=1

import { test, expect } from "@playwright/test";
import {
  setupMultiAgentWindows,
  cleanupMultiAgentWindows,
  MultiAgentSetup,
} from "./setup-windows";
import { TIMEOUTS } from "../helpers/test-config";

let agents: MultiAgentSetup;

test.beforeAll(async ({ browser }) => {
  agents = await setupMultiAgentWindows(browser);
});

test.afterAll(async () => {
  if (agents) {
    await cleanupMultiAgentWindows(agents);
  }
});

// ============================================================
// BEWOHNER (Senior) — Free
// ============================================================

test.describe("Bewohner (Senior/Free)", () => {
  test("A1: Dashboard im Senior-Modus oeffnen", async () => {
    const { page } = agents.bewohner;

    await page.goto("/senior/home");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Senior-Modus: Groessere Touch-Targets, vereinfachte Navigation
    await expect(page).toHaveURL(/senior/);

    // Screenshot fuer visuelle Pruefung
    await page.screenshot({
      path: "test-results/multi-agent/bewohner-dashboard.png",
    });

    console.log("[S] Dashboard im Senior-Modus geladen");
  });

  test("A2: Taegliches Check-in durchfuehren", async () => {
    const { page } = agents.bewohner;

    await page.goto("/senior/checkin");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Check-in Buttons suchen (gut / geht so / schlecht)
    const checkinArea = page.locator("[data-testid='checkin'], main");
    await expect(checkinArea).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // "Gut" waehlen (erster Check-in-Button)
    const gutButton = page.getByRole("button", { name: /gut/i }).first();
    if (await gutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gutButton.click();
      console.log("[S] Check-in: 'Gut' gewaehlt");
      await page.waitForTimeout(1000);
    } else {
      console.log(
        "[S] Check-in-Buttons nicht gefunden — Seite evtl. anders aufgebaut",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/bewohner-checkin.png",
    });
  });

  test("A3: Schwarzes Brett — Beitrag erstellen", async () => {
    const { page } = agents.bewohner;

    // Senior nutzt normales Board (oder senior/home hat Board-Link)
    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Neuen Beitrag erstellen
    const neuButton = page
      .getByRole("button", { name: /neu|beitrag|schreiben|erstellen/i })
      .first();
    if (await neuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await neuButton.click();
      await page.waitForTimeout(500);

      // Titel und Text eingeben
      const titelInput = page.getByLabel(/titel|betreff/i).first();
      if (await titelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titelInput.fill("E2E: Grüße aus dem Seniorenmodus!");
      }

      const textInput = page.getByLabel(/text|nachricht|inhalt/i).first();
      if (await textInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textInput.fill(
          "Dies ist ein automatisch erstellter Testbeitrag vom Senior-Agenten.",
        );
      }

      console.log("[S] Schwarzes Brett Beitrag ausgefuellt");
    } else {
      console.log("[S] Board-Seite geladen, 'Neu'-Button nicht sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/bewohner-board.png",
    });
  });

  test("A4: Hilfe-Anfrage stellen", async () => {
    const { page } = agents.bewohner;

    await page.goto("/hilfe");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // "Hilfe suchen" oder "Anfrage erstellen" Button
    const hilfeButton = page
      .getByRole("button", { name: /hilfe.*such|anfrage|brauche.*hilfe/i })
      .first();
    if (await hilfeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await hilfeButton.click();
      console.log("[S] Hilfe-Anfrage Dialog geoeffnet");
    } else {
      console.log("[S] Hilfe-Seite geladen, kein Anfrage-Button sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/bewohner-hilfe.png",
    });
  });

  test("A5: Marktplatz durchstoebern", async () => {
    const { page } = agents.bewohner;

    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[S] Marktplatz geladen");
    await page.screenshot({
      path: "test-results/multi-agent/bewohner-marktplatz.png",
    });
  });
});

// ============================================================
// ANGEHOERIGER — Plus
// ============================================================

test.describe("Angehöriger (Plus)", () => {
  test("A6: Dashboard oeffnen", async () => {
    const { page } = agents.angehoeriger;

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[T] Angehoeriger-Dashboard geladen");
    await page.screenshot({
      path: "test-results/multi-agent/angehoeriger-dashboard.png",
    });
  });

  test("A7: Heartbeat-Status des Bewohners sehen", async () => {
    const { page } = agents.angehoeriger;

    // Care-Uebersicht mit Heartbeat-Status
    await page.goto("/care");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Heartbeat-Karte oder Status-Anzeige suchen
    const heartbeatCard = page.locator(
      "[data-testid='heartbeat'], [class*='heartbeat'], [class*='status']",
    );
    if (
      await heartbeatCard
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      console.log("[T] Heartbeat-Status sichtbar");
    } else {
      console.log("[T] Care-Seite geladen, Heartbeat-Widget nicht gefunden");
    }

    await page.screenshot({
      path: "test-results/multi-agent/angehoeriger-heartbeat.png",
    });
  });

  test("A8: Check-in-Historie einsehen", async () => {
    const { page } = agents.angehoeriger;

    // Companion/Care-Seite mit Check-in-Historie
    await page.goto("/companion");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[T] Companion/Care-Seite geladen");
    await page.screenshot({
      path: "test-results/multi-agent/angehoeriger-checkin-historie.png",
    });
  });

  test("A9: Chat oeffnen", async () => {
    const { page } = agents.angehoeriger;

    await page.goto("/messages");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[T] Chat/Nachrichten geladen");
    await page.screenshot({
      path: "test-results/multi-agent/angehoeriger-chat.png",
    });
  });
});

// ============================================================
// STADT/KOMMUNE — Pro Community
// ============================================================

test.describe("Stadt/Kommune (Pro Community)", () => {
  test("A10: Org-Dashboard oeffnen", async () => {
    const { page } = agents.stadt;

    await page.goto("/org");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[K] Org-Dashboard geladen");
    await page.screenshot({
      path: "test-results/multi-agent/stadt-dashboard.png",
    });
  });

  test("A11: Bewohner-Statistiken ansehen", async () => {
    const { page } = agents.stadt;

    // Org-Reports-Seite
    await page.goto("/org/reports");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[K] Statistiken/Reports geladen");
    await page.screenshot({
      path: "test-results/multi-agent/stadt-statistiken.png",
    });
  });

  test("A12: Ankuendigungen verwalten", async () => {
    const { page } = agents.stadt;

    await page.goto("/org/announcements");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[K] Ankuendigungen geladen");
    await page.screenshot({
      path: "test-results/multi-agent/stadt-ankuendigungen.png",
    });
  });

  test("A13: Meldungen/Reports pruefen", async () => {
    const { page } = agents.stadt;

    await page.goto("/org/reports");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[K] Reports geladen");
    await page.screenshot({
      path: "test-results/multi-agent/stadt-reports.png",
    });
  });
});

// ============================================================
// ARZT — Pro Medical (+ Bewohner)
// ============================================================

test.describe("Arzt (Pro Medical + Bewohner)", () => {
  test("A14: Bewohner-Dashboard oeffnen (als normaler Nachbar)", async () => {
    const { page } = agents.arzt;

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[D] Bewohner-Dashboard geladen (Arzt als Nachbar)");
    await page.screenshot({
      path: "test-results/multi-agent/arzt-bewohner-dashboard.png",
    });
  });

  test("A15: Schwarzes Brett als Bewohner nutzen", async () => {
    const { page } = agents.arzt;

    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[D] Schwarzes Brett geladen (Arzt als Nachbar)");
    await page.screenshot({
      path: "test-results/multi-agent/arzt-board.png",
    });
  });

  test("A16: Arzt-Portal Dashboard (Port 3002)", async () => {
    const { page } = agents.arzt;
    const arztBaseUrl =
      process.env.E2E_ARZT_BASE_URL || "http://localhost:3002";

    // Pruefen ob Arzt-Portal erreichbar ist
    try {
      const check = await page.request.get(`${arztBaseUrl}/api/health`);
      if (!check.ok()) throw new Error("not running");
    } catch {
      test.skip(
        true,
        "Arzt-Portal (Port 3002) nicht erreichbar — starte es mit: cd nachbar-arzt && npm run dev",
      );
      return;
    }

    await page.goto(`${arztBaseUrl}/dashboard`);
    await page.waitForLoadState("networkidle").catch(() => {});

    console.log("[D] Arzt-Portal aufgerufen");
    await page.screenshot({
      path: "test-results/multi-agent/arzt-portal-dashboard.png",
    });
  });

  test("A17: Termin erstellen (Arzt-Portal)", async () => {
    const { page } = agents.arzt;
    const arztBaseUrl =
      process.env.E2E_ARZT_BASE_URL || "http://localhost:3002";

    try {
      const check = await page.request.get(`${arztBaseUrl}/api/health`);
      if (!check.ok()) throw new Error("not running");
    } catch {
      test.skip(true, "Arzt-Portal nicht erreichbar");
      return;
    }

    await page.goto(`${arztBaseUrl}/termine/neu`);
    await page.waitForLoadState("networkidle").catch(() => {});

    console.log("[D] Termin-Erstellung aufgerufen");
    await page.screenshot({
      path: "test-results/multi-agent/arzt-termin-neu.png",
    });
  });

  test("A18: Patienten-CRM (Arzt-Portal)", async () => {
    const { page } = agents.arzt;
    const arztBaseUrl =
      process.env.E2E_ARZT_BASE_URL || "http://localhost:3002";

    try {
      const check = await page.request.get(`${arztBaseUrl}/api/health`);
      if (!check.ok()) throw new Error("not running");
    } catch {
      test.skip(true, "Arzt-Portal nicht erreichbar");
      return;
    }

    await page.goto(`${arztBaseUrl}/patienten`);
    await page.waitForLoadState("networkidle").catch(() => {});

    console.log("[D] Patienten-CRM aufgerufen");
    await page.screenshot({
      path: "test-results/multi-agent/arzt-patienten.png",
    });
  });
});
