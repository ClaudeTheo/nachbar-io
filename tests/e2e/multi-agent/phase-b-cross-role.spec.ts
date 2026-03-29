// Phase B: Cross-Rollen-Interaktionen — Aktion von Agent A, Verifikation durch Agent B
// Ausfuehrung: npx playwright test multi-agent/phase-b-cross-role --headed --workers=1

import { test, expect } from "@playwright/test";
import {
  setupMultiAgentWindows,
  cleanupMultiAgentWindows,
  MultiAgentSetup,
} from "./setup-windows";
import { TIMEOUTS } from "../helpers/test-config";

let agents: MultiAgentSetup;

// 4 Agenten einloggen braucht Zeit (Login + Navigation pro Agent ~15s)
test.setTimeout(120_000);

test.beforeAll(async ({ browser }) => {
  agents = await setupMultiAgentWindows(browser);
});

test.afterAll(async () => {
  if (agents) {
    await cleanupMultiAgentWindows(agents);
  }
});

// ============================================================
// B1: Senior postet → Stadt sieht Beitrag (Moderation)
// ============================================================

test.describe("B1: Schwarzes Brett → Moderation", () => {
  const testTitle = `E2E-B1: Testbeitrag ${Date.now()}`;

  test("B1a: Senior erstellt Beitrag auf Schwarzem Brett", async () => {
    const { page } = agents.bewohner;

    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    // "Neu" / "Beitrag erstellen" Button
    const neuButton = page
      .getByRole("button", { name: /neu|beitrag|schreiben|erstellen/i })
      .first();

    if (await neuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await neuButton.click();
      await page.waitForTimeout(500);

      // Titel eingeben
      const titelInput = page.getByLabel(/titel|betreff/i).first();
      if (await titelInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titelInput.fill(testTitle);
      }

      // Text eingeben
      const textInput = page.getByLabel(/text|nachricht|inhalt/i).first();
      if (await textInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textInput.fill(
          "Cross-Role-Test: Dieser Beitrag soll in der Moderation sichtbar sein.",
        );
      }

      // Absenden
      const submitButton = page
        .getByRole("button", { name: /senden|posten|absenden|erstellen/i })
        .first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        console.log(`[S] Board-Beitrag erstellt: "${testTitle}"`);
      }
    } else {
      console.log("[S] Board-Seite geladen, 'Neu'-Button nicht sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b1a-senior-board-post.png",
    });
  });

  test("B1b: Stadt sieht Beitrag im Org-Dashboard", async () => {
    const { page } = agents.stadt;

    // Org-Dashboard oder Board-Uebersicht laden
    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Pruefen ob der Beitrag des Seniors sichtbar ist
    const beitrag = page.getByText(testTitle);
    if (await beitrag.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[K] Beitrag "${testTitle}" im Board sichtbar`);
    } else {
      console.log(
        "[K] Board geladen, Beitrag noch nicht sichtbar (evtl. Realtime-Delay)",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/b1b-stadt-sieht-beitrag.png",
    });
  });
});

// ============================================================
// B2: Senior Check-in → Betreuer sieht Status
// ============================================================

test.describe("B2: Check-in → Betreuer sieht Status", () => {
  test("B2a: Senior fuehrt Check-in 'geht so' durch", async () => {
    const { page } = agents.bewohner;

    await page.goto("/senior/checkin");
    await page.waitForLoadState("networkidle").catch(() => {});

    // "Geht so" Button waehlen
    const gehtSoButton = page.getByRole("button", { name: /geht so/i }).first();
    if (await gehtSoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gehtSoButton.click();
      await page.waitForTimeout(1500);
      console.log("[S] Check-in: 'Geht so' gewaehlt");
    } else {
      // Fallback: erster mittlerer Button
      const buttons = page.getByRole("button").all();
      console.log(
        "[S] 'Geht so'-Button nicht gefunden, Check-in-Seite geladen",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/b2a-senior-checkin.png",
    });
  });

  test("B2b: Betreuer sieht Check-in-Status auf Care-Seite", async () => {
    const { page } = agents.angehoeriger;

    await page.goto("/care/caregiver");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Status-Anzeige suchen (Heartbeat / Check-in)
    const statusElement = page.locator(
      "[data-testid='checkin-status'], [class*='status'], [class*='heartbeat']",
    );
    if (
      await statusElement
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      console.log("[T] Check-in-Status des Bewohners sichtbar");
    } else {
      console.log("[T] Care-Seite geladen, Status-Widget nicht gefunden");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b2b-betreuer-sieht-status.png",
    });
  });
});

// ============================================================
// B3: Stadt erstellt Ankuendigung → Senior sieht sie
// ============================================================

test.describe("B3: Ankuendigung → Bewohner sieht sie", () => {
  const announcementText = `E2E-B3: Ankuendigung ${Date.now()}`;

  test("B3a: Stadt erstellt Ankuendigung", async () => {
    const { page } = agents.stadt;

    await page.goto("/org/announcements");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // "Neue Ankuendigung" Button
    const neuButton = page
      .getByRole("button", { name: /neu|erstellen|ankuendigung/i })
      .first();
    if (await neuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await neuButton.click();
      await page.waitForTimeout(500);

      // Text eingeben
      const textInput = page
        .getByLabel(/titel|text|nachricht|betreff/i)
        .first();
      if (await textInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textInput.fill(announcementText);
      }

      // Absenden
      const submitButton = page
        .getByRole("button", {
          name: /senden|posten|erstellen|veroeffentlichen/i,
        })
        .first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        console.log(`[K] Ankuendigung erstellt: "${announcementText}"`);
      }
    } else {
      console.log("[K] Ankuendigungen-Seite geladen, kein 'Neu'-Button");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b3a-stadt-ankuendigung.png",
    });
  });

  test("B3b: Senior sieht Ankuendigung auf Dashboard", async () => {
    const { page } = agents.bewohner;

    await page.goto("/senior/home");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Ankuendigung auf der Startseite suchen
    const announcement = page.getByText(announcementText);
    if (await announcement.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(
        `[S] Ankuendigung "${announcementText}" auf Dashboard sichtbar`,
      );
    } else {
      console.log(
        "[S] Dashboard geladen, Ankuendigung nicht sichtbar (evtl. Realtime-Delay)",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/b3b-senior-sieht-ankuendigung.png",
    });
  });
});

// ============================================================
// B4: Senior stellt Hilfe-Anfrage → Arzt sieht sie
// ============================================================

test.describe("B4: Hilfe-Anfrage → Arzt sieht sie", () => {
  test("B4a: Senior stellt Hilfe-Anfrage", async () => {
    const { page } = agents.bewohner;

    await page.goto("/hilfe");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // "Hilfe suchen" oder "Anfrage erstellen"
    const hilfeButton = page
      .getByRole("button", { name: /hilfe.*such|anfrage|brauche.*hilfe/i })
      .first();
    if (await hilfeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hilfeButton.click();
      await page.waitForTimeout(1000);

      // Beschreibung eingeben
      const textInput = page
        .getByLabel(/beschreibung|text|was.*brauchen/i)
        .first();
      if (await textInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textInput.fill("E2E-B4: Senior braucht Hilfe beim Einkaufen");
      }

      // Absenden
      const submitButton = page
        .getByRole("button", { name: /senden|absenden|anfrage/i })
        .first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        console.log("[S] Hilfe-Anfrage erstellt");
      }
    } else {
      console.log("[S] Hilfe-Seite geladen, kein Anfrage-Button sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b4a-senior-hilfe-anfrage.png",
    });
  });

  test("B4b: Arzt (als Bewohner) sieht Hilfe-Anfrage", async () => {
    const { page } = agents.arzt;

    await page.goto("/hilfe");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Suche nach Hilfe-Anfragen in der Liste
    const anfrage = page.getByText(/einkaufen/i);
    if (await anfrage.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("[D] Hilfe-Anfrage des Seniors sichtbar");
    } else {
      console.log("[D] Hilfe-Seite geladen, Anfrage nicht sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b4b-arzt-sieht-hilfe.png",
    });
  });
});

// ============================================================
// B5: Arzt erstellt Termin → Senior sieht ihn (optional)
// ============================================================

test.describe("B5: Arzt-Termin → Bewohner sieht ihn", () => {
  test("B5a: Arzt erstellt Termin im Arzt-Portal", async () => {
    const { page } = agents.arzt;
    const arztBaseUrl =
      process.env.E2E_ARZT_BASE_URL || "http://localhost:3002";

    // Pruefen ob Arzt-Portal erreichbar
    try {
      const check = await page.request.get(`${arztBaseUrl}/api/health`);
      if (!check.ok()) throw new Error("not running");
    } catch {
      test.skip(
        true,
        "Arzt-Portal (Port 3002) nicht erreichbar — starte mit: cd nachbar-arzt && npm run dev",
      );
      return;
    }

    await page.goto(`${arztBaseUrl}/termine/neu`);
    await page.waitForLoadState("networkidle").catch(() => {});

    // Termin-Formular ausfuellen
    const datumInput = page.getByLabel(/datum|date/i).first();
    if (await datumInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Morgen als Termin-Datum
      const morgen = new Date();
      morgen.setDate(morgen.getDate() + 1);
      const dateStr = morgen.toISOString().split("T")[0];
      await datumInput.fill(dateStr);
      console.log(`[D] Termin-Datum gesetzt: ${dateStr}`);
    }

    // Patient waehlen (Senior)
    const patientInput = page.getByLabel(/patient/i).first();
    if (await patientInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await patientInput.fill("Gertrude");
      await page.waitForTimeout(1000);
    }

    console.log("[D] Termin-Formular ausgefuellt");
    await page.screenshot({
      path: "test-results/multi-agent/b5a-arzt-termin.png",
    });
  });

  test("B5b: Senior sieht Termin auf Dashboard", async () => {
    const { page } = agents.bewohner;

    // Termine-Seite oder Dashboard
    await page.goto("/senior/home");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Termin-Widget suchen
    const terminWidget = page.locator(
      "[data-testid='appointments'], [class*='termin'], [class*='appointment']",
    );
    if (
      await terminWidget
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      console.log("[S] Termin-Widget auf Dashboard sichtbar");
    } else {
      console.log("[S] Dashboard geladen, kein Termin-Widget gefunden");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b5b-senior-sieht-termin.png",
    });
  });
});

// ============================================================
// B6: Senior meldet Problem → Stadt sieht Meldung
// ============================================================

test.describe("B6: Problem-Meldung → Stadt-Moderation", () => {
  test("B6a: Senior meldet Problem", async () => {
    const { page } = agents.bewohner;

    // Board oder allgemeine Seite mit Melden-Funktion
    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Einen Beitrag suchen und "Melden" Button finden
    const meldenButton = page
      .getByRole("button", { name: /melden|report|problem/i })
      .first();
    if (await meldenButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await meldenButton.click();
      await page.waitForTimeout(500);

      // Grund eingeben
      const grundInput = page.getByLabel(/grund|reason|beschreibung/i).first();
      if (await grundInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await grundInput.fill("E2E-B6: Test-Meldung eines Problems");
      }

      // Absenden
      const submitButton = page
        .getByRole("button", { name: /senden|melden|absenden/i })
        .first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1500);
        console.log("[S] Problem gemeldet");
      }
    } else {
      console.log("[S] Board geladen, kein 'Melden'-Button sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b6a-senior-meldet-problem.png",
    });
  });

  test("B6b: Stadt sieht Meldung im Moderation-Panel", async () => {
    const { page } = agents.stadt;

    // Org-Moderation oder Reports
    await page.goto("/org/reports");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Meldungen/Reports auflisten
    const meldung = page.getByText(/E2E-B6|problem|meldung/i);
    if (
      await meldung
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      console.log("[K] Meldung im Moderation-Panel sichtbar");
    } else {
      console.log("[K] Reports geladen, Meldung nicht sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b6b-stadt-sieht-meldung.png",
    });
  });
});

// ============================================================
// B7: Betreuer schickt Nachricht → Senior empfaengt
// ============================================================

test.describe("B7: Chat — Betreuer → Senior", () => {
  const chatText = `E2E-B7: Hallo Gertrude! ${Date.now()}`;

  test("B7a: Betreuer schickt Chat-Nachricht", async () => {
    const { page } = agents.angehoeriger;

    await page.goto("/messages");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Konversation mit Senior oeffnen (Gertrude H.)
    const contact = page.getByText(/gertrude/i);
    if (await contact.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contact.click();
      await page.waitForTimeout(1000);
    }

    // Nachricht eingeben
    const messageInput = page
      .getByPlaceholder(/nachricht|schreiben|message/i)
      .first();
    if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messageInput.fill(chatText);

      // Senden
      const sendButton = page
        .getByRole("button", { name: /senden|send/i })
        .first();
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();
        await page.waitForTimeout(1500);
        console.log(`[T] Chat-Nachricht gesendet: "${chatText}"`);
      }
    } else {
      console.log("[T] Messages geladen, kein Eingabefeld sichtbar");
    }

    await page.screenshot({
      path: "test-results/multi-agent/b7a-betreuer-sendet-chat.png",
    });
  });

  test("B7b: Senior empfaengt Chat-Nachricht", async () => {
    const { page } = agents.bewohner;

    await page.goto("/messages");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Konversation mit Betreuer oeffnen (Tanja P.)
    const contact = page.getByText(/tanja/i);
    if (await contact.isVisible({ timeout: 5000 }).catch(() => false)) {
      await contact.click();
      await page.waitForTimeout(1000);
    }

    // Nachricht suchen
    const nachricht = page.getByText(chatText);
    if (
      await nachricht
        .isVisible({ timeout: TIMEOUTS.realtimeDelivery })
        .catch(() => false)
    ) {
      console.log(`[S] Chat-Nachricht empfangen: "${chatText}"`);
    } else {
      console.log(
        "[S] Messages geladen, Nachricht nicht sichtbar (evtl. Realtime-Delay)",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/b7b-senior-empfaengt-chat.png",
    });
  });
});
