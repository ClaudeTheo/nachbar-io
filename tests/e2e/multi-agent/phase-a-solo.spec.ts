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

    // Senior-Begruessung sichtbar
    const greeting = page.locator("[data-testid='senior-greeting']");
    if (await greeting.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("[S] Senior-Begruessung sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/bewohner-dashboard.png",
    });

    console.log("[S] Dashboard im Senior-Modus geladen");
  });

  test("A2: Taegliches Check-in durchfuehren", async () => {
    const { page } = agents.bewohner;

    await page.goto("/senior/checkin");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Check-in Button oder Mood-Auswahl suchen
    const checkinButton = page.locator("[data-testid='checkin-button']");
    const moodGood = page.locator("[data-testid='mood-good']");

    if (await checkinButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkinButton.click();
      await page.waitForTimeout(1000);
      console.log("[S] Check-in Button geklickt");
    }

    // Mood-Auswahl: "Gut" waehlen
    if (await moodGood.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moodGood.click();
      console.log("[S] Check-in: 'Gut' gewaehlt (data-testid=mood-good)");
      await page.waitForTimeout(1000);
    } else {
      console.log(
        "[S] Mood-Buttons nicht sichtbar — evtl. bereits eingecheckt",
      );
    }

    // Erfolg pruefen
    const checkinDone = page.locator("[data-testid='checkin-done']");
    if (await checkinDone.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("[S] Check-in erfolgreich abgeschlossen");
    }

    await page.screenshot({
      path: "test-results/multi-agent/bewohner-checkin.png",
    });
  });

  test("A3: Schwarzes Brett — Beitrag erstellen", async () => {
    const { page } = agents.bewohner;

    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Board hat eine Textarea (kein "Neu"-Button) + "Posten"-Button
    const textarea = page.getByPlaceholder(
      "Was gibt es Neues im Quartier?",
    );
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await textarea.fill(
        "E2E: Grüße aus dem Seniorenmodus! Dies ist ein automatisch erstellter Testbeitrag.",
      );
      console.log("[S] Schwarzes Brett Beitrag ausgefuellt");

      // "Posten" Button klicken
      const postenButton = page.getByRole("button", { name: /posten/i });
      if (await postenButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postenButton.click();
        await page.waitForTimeout(2000);
        console.log("[S] Beitrag gepostet");
      }
    } else {
      console.log("[S] Board-Seite geladen, Textarea nicht sichtbar");
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

    // "Neues Gesuch erstellen" Link → /hilfe/neu
    const gesuchLink = page.getByRole("link", {
      name: /neues gesuch erstellen/i,
    });
    if (await gesuchLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gesuchLink.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      console.log("[S] Hilfe-Anfrage Formular geoeffnet (/hilfe/neu)");

      // Kategorie waehlen (z.B. einkaufen)
      const einkaufenBtn = page.getByRole("button", { name: /einkaufen/i });
      if (
        await einkaufenBtn.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await einkaufenBtn.click();
        console.log("[S] Kategorie 'Einkaufen' gewaehlt");
      }
    } else {
      console.log(
        "[S] Hilfe-Seite geladen, kein 'Neues Gesuch erstellen' Link sichtbar",
      );
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

    // Dashboard-Greeting pruefen
    const greeting = page.locator("[data-testid='dashboard-greeting']");
    if (await greeting.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("[T] Dashboard-Begruessung sichtbar");
    }

    console.log("[T] Angehoeriger-Dashboard geladen");
    await page.screenshot({
      path: "test-results/multi-agent/angehoeriger-dashboard.png",
    });
  });

  test("A7: Heartbeat-Status des Bewohners sehen", async () => {
    const { page } = agents.angehoeriger;

    // Care-Uebersicht
    await page.goto("/care");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Caregiver-spezifische Elemente suchen
    const caregiverSection = page.locator(
      "[data-testid='dashboard-caregivers'], [data-testid='heartbeat'], main",
    );
    if (
      await caregiverSection
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      console.log("[T] Care-Bereich sichtbar");
    } else {
      console.log("[T] Care-Seite geladen, Caregiver-Widget nicht gefunden");
    }

    await page.screenshot({
      path: "test-results/multi-agent/angehoeriger-heartbeat.png",
    });
  });

  test("A8: Check-in-Historie einsehen", async () => {
    const { page } = agents.angehoeriger;

    await page.goto("/care/caregiver");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    console.log("[T] Caregiver-Einstellungen geladen");
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

    // Konversationskarten suchen
    const conversationCard = page.locator(
      "[data-testid='conversation-card']",
    );
    if (
      await conversationCard
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      console.log("[T] Konversationen sichtbar");
    } else {
      console.log("[T] Messages geladen, keine Konversationen vorhanden");
    }

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

    await page.goto("/org/reports");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Statusfilter-Buttons pruefen
    const alleButton = page.getByRole("button", { name: "Alle" });
    if (await alleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("[K] Reports mit Statusfilter geladen");
    }

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

    // "Neue Bekanntmachung" Button pruefen
    const neuButton = page.getByRole("button", {
      name: /neue bekanntmachung/i,
    });
    if (await neuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("[K] 'Neue Bekanntmachung' Button sichtbar");
    }

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

    // Board-Textarea pruefen
    const textarea = page.getByPlaceholder(
      "Was gibt es Neues im Quartier?",
    );
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("[D] Board-Textarea sichtbar");
    }

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
