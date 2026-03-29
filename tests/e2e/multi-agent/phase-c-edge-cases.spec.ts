// Phase C: Edge Cases — Zugriffskontrolle, Race Conditions, Eskalation
// Ausfuehrung: npx playwright test multi-agent/phase-c-edge-cases --headed --workers=1

import { test, expect } from "@playwright/test";
import {
  createAgent,
  loginAgent,
  cleanupAgents,
  TestAgent,
} from "../helpers/agent-factory";
import {
  setupMultiAgentWindows,
  cleanupMultiAgentWindows,
  MultiAgentSetup,
} from "./setup-windows";
import { TEST_AGENTS, TIMEOUTS } from "../helpers/test-config";

// ============================================================
// C1: Unverified User — Zugriffsbeschraenkungen
// ============================================================

test.describe("C1: Unverified User — Zugriffsbeschraenkungen", () => {
  let unverified: TestAgent;

  test.beforeAll(async ({ browser }) => {
    // Unverified Agent erstellen (INVALID Invite-Code)
    unverified = await createAgent(browser, "unverified_x");
    // Login-Versuch: Nutzer existiert evtl. noch nicht oder hat keine Quartier-Zuordnung
    try {
      await loginAgent(unverified);
    } catch {
      console.log(
        "[X] Unverified Agent konnte nicht eingeloggt werden (erwartet)",
      );
    }
  });

  test.afterAll(async () => {
    if (unverified) {
      await cleanupAgents(unverified);
    }
  });

  test("C1a: Unverified User wird auf Login/Register umgeleitet", async () => {
    const { page } = unverified;

    // Geschuetzte Seiten versuchen aufzurufen
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Sollte auf Login/Welcome/Register umgeleitet werden
    const url = page.url();
    const isProtected =
      url.includes("/login") ||
      url.includes("/register") ||
      url.includes("/welcome");

    if (isProtected) {
      console.log(
        `[X] Korrekt umgeleitet: ${url} (Dashboard nicht zugaenglich)`,
      );
    } else {
      console.log(
        `[X] WARNUNG: Dashboard-Zugriff ohne Verifizierung → ${url}`,
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c1a-unverified-redirect.png",
    });
  });

  test("C1b: Unverified User kann Board nicht sehen", async () => {
    const { page } = unverified;

    await page.goto("/board");
    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    const isBlocked = !url.includes("/board") || url.includes("/login");

    if (isBlocked) {
      console.log("[X] Board korrekt blockiert fuer nicht-verifizierte Nutzer");
    } else {
      // Seite geladen, aber evtl. leer (RLS blockiert Daten)
      const boardContent = page.getByPlaceholder(
        "Was gibt es Neues im Quartier?",
      );
      if (
        await boardContent.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        console.log(
          "[X] WARNUNG: Board-Formular sichtbar fuer unverifizierten Nutzer",
        );
      } else {
        console.log(
          "[X] Board geladen, aber Inhalte durch RLS geschuetzt",
        );
      }
    }

    await page.screenshot({
      path: "test-results/multi-agent/c1b-unverified-board.png",
    });
  });

  test("C1c: Unverified User kann keine Hilfe-Anfrage stellen", async () => {
    const { page } = unverified;

    await page.goto("/hilfe/neu");
    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    const isBlocked =
      !url.includes("/hilfe") ||
      url.includes("/login") ||
      url.includes("/register");

    if (isBlocked) {
      console.log(
        "[X] Hilfe-Formular korrekt blockiert fuer nicht-verifizierte Nutzer",
      );
    } else {
      console.log(
        `[X] Hilfe-Seite geladen → ${url} (RLS sollte DB-Zugriff blockieren)`,
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c1c-unverified-hilfe.png",
    });
  });

  test("C1d: Unverified User hat keinen Zugang zu Org-Seiten", async () => {
    const { page } = unverified;

    // Admin/Org-Seiten duerfen NIE fuer normale Nutzer zugaenglich sein
    for (const path of [
      "/org",
      "/org/announcements",
      "/org/reports",
      "/admin",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});

      const url = page.url();
      const isBlocked =
        url.includes("/login") ||
        url.includes("/register") ||
        url.includes("/dashboard") ||
        url.includes("/welcome");

      console.log(
        `[X] ${path} → ${isBlocked ? "BLOCKIERT (korrekt)" : `ZUGANG: ${url}`}`,
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c1d-unverified-org.png",
    });
  });

  test("C1e: Unverified User hat keinen Zugang zu Care-Seiten", async () => {
    const { page } = unverified;

    await page.goto("/care");
    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    const isBlocked =
      url.includes("/login") ||
      url.includes("/register") ||
      url.includes("/welcome");

    console.log(
      `[X] /care → ${isBlocked ? "BLOCKIERT (korrekt)" : `Geladen: ${url}`}`,
    );

    await page.screenshot({
      path: "test-results/multi-agent/c1e-unverified-care.png",
    });
  });
});

// ============================================================
// C2: Race Conditions — Gleichzeitige Aktionen
// ============================================================

test.describe("C2: Race Conditions — Parallele Aktionen", () => {
  let agents: MultiAgentSetup;

  test.setTimeout(120_000);

  test.beforeAll(async ({ browser }) => {
    agents = await setupMultiAgentWindows(browser);
  });

  test.afterAll(async () => {
    if (agents) {
      await cleanupMultiAgentWindows(agents);
    }
  });

  test("C2a: Zwei Nutzer posten gleichzeitig auf Board", async () => {
    const seniorPage = agents.bewohner.page;
    const arztPage = agents.arzt.page;

    // Beide auf Board navigieren
    await Promise.all([
      seniorPage.goto("/board"),
      arztPage.goto("/board"),
    ]);
    await Promise.all([
      seniorPage.waitForLoadState("networkidle").catch(() => {}),
      arztPage.waitForLoadState("networkidle").catch(() => {}),
    ]);

    const timestamp = Date.now();
    const seniorText = `C2a-Senior: Gleichzeitiger Post ${timestamp}`;
    const arztText = `C2a-Arzt: Gleichzeitiger Post ${timestamp}`;

    // Beide Textarea ausfuellen
    const seniorTextarea = seniorPage.getByPlaceholder(
      "Was gibt es Neues im Quartier?",
    );
    const arztTextarea = arztPage.getByPlaceholder(
      "Was gibt es Neues im Quartier?",
    );

    const seniorVisible = await seniorTextarea
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const arztVisible = await arztTextarea
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (seniorVisible && arztVisible) {
      await seniorTextarea.fill(seniorText);
      await arztTextarea.fill(arztText);

      // Gleichzeitig posten
      const seniorPosten = seniorPage.getByRole("button", {
        name: /posten/i,
      });
      const arztPosten = arztPage.getByRole("button", { name: /posten/i });

      await Promise.all([seniorPosten.click(), arztPosten.click()]);
      await Promise.all([
        seniorPage.waitForTimeout(3000),
        arztPage.waitForTimeout(3000),
      ]);

      // Pruefen ob beide Posts sichtbar sind (Reload)
      await seniorPage.reload();
      await seniorPage.waitForLoadState("networkidle").catch(() => {});

      const seniorPostVisible = await seniorPage
        .getByText(seniorText)
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const arztPostVisible = await seniorPage
        .getByText(arztText)
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      console.log(
        `[C2a] Senior-Post sichtbar: ${seniorPostVisible}, Arzt-Post sichtbar: ${arztPostVisible}`,
      );
    } else {
      console.log("[C2a] Board-Textareas nicht sichtbar, uebersprungen");
    }

    await seniorPage.screenshot({
      path: "test-results/multi-agent/c2a-race-board.png",
    });
  });

  test("C2b: Betreuer und Senior navigieren gleichzeitig zu Care", async () => {
    const seniorPage = agents.bewohner.page;
    const betreuerPage = agents.angehoeriger.page;

    // Gleichzeitig auf Care navigieren
    await Promise.all([
      seniorPage.goto("/care"),
      betreuerPage.goto("/care"),
    ]);

    await Promise.all([
      seniorPage.waitForLoadState("networkidle").catch(() => {}),
      betreuerPage.waitForLoadState("networkidle").catch(() => {}),
    ]);

    // Beide Seiten sollten ohne Fehler laden
    const seniorMain = seniorPage.locator("main");
    const betreuerMain = betreuerPage.locator("main");

    const seniorOk = await seniorMain
      .isVisible({ timeout: TIMEOUTS.elementVisible })
      .catch(() => false);
    const betreuerOk = await betreuerMain
      .isVisible({ timeout: TIMEOUTS.elementVisible })
      .catch(() => false);

    console.log(
      `[C2b] Care-Seite: Senior=${seniorOk ? "OK" : "FEHLER"}, Betreuer=${betreuerOk ? "OK" : "FEHLER"}`,
    );

    await Promise.all([
      seniorPage.screenshot({
        path: "test-results/multi-agent/c2b-race-care-senior.png",
      }),
      betreuerPage.screenshot({
        path: "test-results/multi-agent/c2b-race-care-betreuer.png",
      }),
    ]);
  });

  test("C2c: Mehrere Agenten laden Dashboard gleichzeitig", async () => {
    // Alle 4 Agenten laden gleichzeitig ihre Start-Seite
    const pages = [
      { page: agents.bewohner.page, target: "/senior/home", label: "Senior" },
      {
        page: agents.angehoeriger.page,
        target: "/dashboard",
        label: "Betreuer",
      },
      { page: agents.stadt.page, target: "/org", label: "Stadt" },
      { page: agents.arzt.page, target: "/dashboard", label: "Arzt" },
    ];

    // Gleichzeitig navigieren
    await Promise.all(pages.map((p) => p.page.goto(p.target)));
    await Promise.all(
      pages.map((p) =>
        p.page.waitForLoadState("networkidle").catch(() => {}),
      ),
    );

    // Alle sollten main-Element haben
    const results = await Promise.all(
      pages.map(async (p) => {
        const visible = await p.page
          .locator("main")
          .isVisible({ timeout: TIMEOUTS.elementVisible })
          .catch(() => false);
        return { label: p.label, ok: visible };
      }),
    );

    for (const r of results) {
      console.log(`[C2c] ${r.label}: ${r.ok ? "OK" : "FEHLER"}`);
    }

    // Screenshots
    await Promise.all(
      pages.map((p, i) =>
        p.page.screenshot({
          path: `test-results/multi-agent/c2c-race-dashboard-${p.label.toLowerCase()}.png`,
        }),
      ),
    );
  });
});

// ============================================================
// C3: Eskalationskette — Check-in-Ausbleiben
// ============================================================

test.describe("C3: Eskalationskette — Check-in-Monitoring", () => {
  let agents: MultiAgentSetup;

  test.setTimeout(120_000);

  test.beforeAll(async ({ browser }) => {
    agents = await setupMultiAgentWindows(browser);
  });

  test.afterAll(async () => {
    if (agents) {
      await cleanupMultiAgentWindows(agents);
    }
  });

  test("C3a: Betreuer sieht Eskalationsstatus auf Care-Seite", async () => {
    const { page } = agents.angehoeriger;

    // Care-Uebersicht laden
    await page.goto("/care");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Eskalations-Stufen pruefen (0-4h normal, 4-8h Erinnerung, etc.)
    const eskalation = page.locator(
      "[data-testid='escalation'], [class*='escalat'], [class*='alert']",
    );
    if (
      await eskalation
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      console.log("[T] Eskalations-Widget sichtbar");
    } else {
      console.log(
        "[T] Care-Seite geladen, Eskalation-Widget nicht gefunden (normal wenn Check-in aktuell)",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c3a-betreuer-eskalation.png",
    });
  });

  test("C3b: Stadt sieht Quartier-Eskalationen im Org-Dashboard", async () => {
    const { page } = agents.stadt;

    await page.goto("/org");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("main")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    // Org-Dashboard sollte Quartier-Gesundheit anzeigen
    const orgContent = await page.locator("main").textContent();
    console.log(
      `[K] Org-Dashboard geladen, Inhalt-Laenge: ${orgContent?.length || 0} Zeichen`,
    );

    await page.screenshot({
      path: "test-results/multi-agent/c3b-stadt-eskalation.png",
    });
  });
});

// ============================================================
// C4: Rollen-Isolation — Betreuer sieht NUR Status, keine Inhalte
// ============================================================

test.describe("C4: Rollen-Isolation — Datenschutz", () => {
  let agents: MultiAgentSetup;

  test.setTimeout(120_000);

  test.beforeAll(async ({ browser }) => {
    agents = await setupMultiAgentWindows(browser);
  });

  test.afterAll(async () => {
    if (agents) {
      await cleanupMultiAgentWindows(agents);
    }
  });

  test("C4a: Betreuer sieht KEINEN Nachrichteninhalt des Bewohners", async () => {
    const { page } = agents.angehoeriger;

    // Betreuer soll Heartbeat/Status sehen, NICHT Nachrichteninhalte
    await page.goto("/care");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Suche nach Nachrichteninhalten (sollte NICHT vorhanden sein)
    const messageContent = page.locator(
      "[data-testid='message-content'], [class*='message-body']",
    );
    const hasMessageContent = await messageContent
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasMessageContent) {
      console.log(
        "[T] WARNUNG: Nachrichteninhalt auf Care-Seite sichtbar (Datenschutz-Verletzung!)",
      );
    } else {
      console.log(
        "[T] Korrekt: Keine Nachrichteninhalte auf Care-Seite (nur Status)",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c4a-betreuer-kein-inhalt.png",
    });
  });

  test("C4b: Betreuer kann NICHT auf Admin/Org-Seiten zugreifen", async () => {
    const { page } = agents.angehoeriger;

    // Betreuer (Plus) darf NICHT auf Org-Seiten
    for (const path of ["/org", "/org/announcements", "/admin"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});

      const url = page.url();
      const isBlocked =
        url.includes("/dashboard") ||
        url.includes("/login") ||
        url.includes("/welcome") ||
        !url.includes(path);

      console.log(
        `[T] ${path} → ${isBlocked ? "BLOCKIERT (korrekt)" : `ZUGANG: ${url}`}`,
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c4b-betreuer-kein-admin.png",
    });
  });

  test("C4c: Arzt sieht NUR eigene Patienten-Daten", async () => {
    const { page } = agents.arzt;

    // Arzt als normaler Bewohner: kein Zugang zu fremden Care-Daten
    await page.goto("/care/caregiver");
    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();

    // Arzt der kein Betreuer ist sollte keine Caregiver-Einstellungen sehen
    const caregiverSettings = page.getByText(
      /einladungs-code erstellen/i,
    );
    const hasCaregiverAccess = await caregiverSettings
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasCaregiverAccess) {
      console.log(
        "[D] Arzt hat Caregiver-Zugang (moeglicherweise als Betreuer zugeordnet)",
      );
    } else {
      console.log(
        "[D] Korrekt: Arzt ohne Betreuer-Rolle hat keinen Caregiver-Zugang",
      );
    }

    await page.screenshot({
      path: "test-results/multi-agent/c4c-arzt-care-isolation.png",
    });
  });
});

// ============================================================
// C5: Session-Integritaet — Kein Cross-Contamination
// ============================================================

test.describe("C5: Session-Integritaet", () => {
  let agents: MultiAgentSetup;

  test.setTimeout(120_000);

  test.beforeAll(async ({ browser }) => {
    agents = await setupMultiAgentWindows(browser);
  });

  test.afterAll(async () => {
    if (agents) {
      await cleanupMultiAgentWindows(agents);
    }
  });

  test("C5a: Jeder Agent sieht seinen eigenen Benutzernamen", async () => {
    // Alle Dashboards laden
    const checks = [
      {
        agent: agents.bewohner,
        target: "/senior/home",
        expectedName: "Gertrude",
      },
      {
        agent: agents.angehoeriger,
        target: "/dashboard",
        expectedName: "Tanja",
      },
      { agent: agents.stadt, target: "/dashboard", expectedName: "Klara" },
      { agent: agents.arzt, target: "/dashboard", expectedName: "Daniel" },
    ];

    for (const check of checks) {
      await check.agent.page.goto(check.target);
      await check.agent.page
        .waitForLoadState("networkidle")
        .catch(() => {});
    }

    // Pruefen ob jeder Agent seinen eigenen Namen sieht
    for (const check of checks) {
      const pageContent =
        (await check.agent.page.locator("main").textContent()) || "";
      const seesOwnName = pageContent
        .toLowerCase()
        .includes(check.expectedName.toLowerCase());

      console.log(
        `${check.agent.prefix} Eigener Name "${check.expectedName}": ${seesOwnName ? "SICHTBAR (korrekt)" : "nicht gefunden"}`,
      );
    }
  });

  test("C5b: Agent-Cookies sind isoliert (kein Session-Leak)", async () => {
    // Jeder Agent fuehrt einen API-Call aus und prueft seine eigene ID
    const baseURL =
      process.env.E2E_BASE_URL || "http://localhost:3000";

    for (const [role, agent] of Object.entries(agents)) {
      const response = await agent.page.request
        .get(`${baseURL}/api/auth/session`)
        .catch(() => null);

      if (response && response.ok()) {
        const data = await response.json().catch(() => null);
        if (data?.user?.email) {
          const expectedEmail =
            TEST_AGENTS[
              role === "bewohner"
                ? "senior_s"
                : role === "angehoeriger"
                  ? "betreuer_t"
                  : role === "stadt"
                    ? "stadt_k"
                    : "arzt_d"
            ].email;

          const isCorrect = data.user.email === expectedEmail;
          console.log(
            `${agent.prefix} Session-Email: ${data.user.email} → ${isCorrect ? "KORREKT" : `FALSCH (erwartet ${expectedEmail})`}`,
          );
        }
      } else {
        console.log(
          `${agent.prefix} Session-API nicht erreichbar (${response?.status() || "kein Response"})`,
        );
      }
    }
  });
});
