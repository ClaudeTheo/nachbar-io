// Nachbar.io — Agent Factory: Erstellt isolierte Browser-Kontexte pro Rolle
import { Browser, BrowserContext, Page } from "@playwright/test";
import type { AgentCredentials, AgentRole } from "./types";
import { TEST_AGENTS, TIMEOUTS } from "./test-config";

export interface TestAgent {
  id: string;
  role: AgentRole;
  credentials: AgentCredentials;
  context: BrowserContext;
  page: Page;
  /** Log-Prefix fuer Konsolen-Ausgabe */
  prefix: string;
}

/**
 * Erstellt einen Test-Agenten mit eigenem Browser-Kontext.
 * Jeder Agent hat separate Cookies/Storage → vollstaendige Isolation.
 */
export async function createAgent(
  browser: Browser,
  agentId: string,
  options?: {
    credentials?: AgentCredentials;
    baseURL?: string;
    viewport?: { width: number; height: number };
  },
): Promise<TestAgent> {
  const credentials = options?.credentials || TEST_AGENTS[agentId];
  if (!credentials) {
    throw new Error(
      `Unbekannter Agent: ${agentId}. Verfuegbar: ${Object.keys(TEST_AGENTS).join(", ")}`,
    );
  }

  // Prefixes fuer Log-Ausgabe
  const prefixMap: Record<AgentRole, string> = {
    nachbar: "[A]",
    hilfesuchend: "[H]",
    helfer: "[B]",
    moderator: "[M]",
    senior: "[S]",
    betreuer: "[T]",
    unverified: "[X]",
    guest: "[G]",
  };
  const prefix = prefixMap[credentials.role] || `[${agentId.toUpperCase()}]`;

  // Viewport: Senioren bekommen Mobile-Viewport fuer groessere Touch-Targets
  const viewport =
    options?.viewport ||
    (credentials.uiMode === "senior"
      ? { width: 393, height: 851 } // Pixel 5
      : { width: 1280, height: 720 }); // Desktop

  // Eigener Browser-Kontext = eigene Session/Cookies
  const context = await browser.newContext({
    baseURL:
      options?.baseURL || process.env.E2E_BASE_URL || "http://localhost:3000",
    viewport,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    permissions: ["notifications"], // Push-Notifications erlauben
    // Bildschirmaufloesung fuer Screenshots
    deviceScaleFactor: 1,
  });

  // Konsolen-Logs mit Agent-Prefix taggen
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`${prefix} CONSOLE ERROR: ${msg.text()}`);
    }
  });

  // Uncaught Errors loggen
  page.on("pageerror", (err) => {
    console.error(`${prefix} PAGE ERROR: ${err.message}`);
  });

  return {
    id: agentId,
    role: credentials.role,
    credentials,
    context,
    page,
    prefix,
  };
}

/**
 * Agent einloggen via UI (Login-Formular).
 * Setzt voraus, dass der Account bereits existiert (via Seeding).
 */
export async function loginAgent(agent: TestAgent): Promise<void> {
  const { page, credentials, prefix } = agent;

  console.log(
    `${prefix} Login als ${credentials.displayName} (${credentials.email})`,
  );

  await page.goto("/login");
  // Auf Hydration warten (Login-Seite zeigt Magic-Link als Standard)
  await page.getByText("Anmelden", { exact: true }).first().waitFor({
    state: "visible",
    timeout: TIMEOUTS.pageLoad,
  });
  await page
    .waitForLoadState("networkidle", { timeout: TIMEOUTS.networkIdle })
    .catch(() => {});

  // Zum Passwort-Modus wechseln (Magic Link ist Standard seit v3)
  await page.getByText("Stattdessen mit Passwort anmelden").click();
  await page
    .getByLabel("Passwort")
    .waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });

  // Passwort-Login
  await page.locator("#email-pw").fill(credentials.email);
  await page.getByLabel("Passwort").fill(credentials.password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Auf Weiterleitung warten
  if (credentials.uiMode === "senior") {
    await page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
  } else {
    await page.waitForURL("**/dashboard**", { timeout: TIMEOUTS.pageLoad });
  }

  console.log(`${prefix} Login erfolgreich → ${page.url()}`);
}

/**
 * Agent registrieren via UI (4-Schritt Registrierung).
 * Hinweis: Nur fuer Agenten mit gueltigem Invite-Code.
 */
export async function registerAgent(agent: TestAgent): Promise<void> {
  const { page, credentials, prefix } = agent;

  console.log(`${prefix} Registrierung als ${credentials.displayName}`);

  await page.goto("/register");

  // Schritt 1: Credentials
  await page.getByLabel("E-Mail-Adresse").fill(credentials.email);
  await page.getByLabel("Passwort").fill(credentials.password);
  await page.getByRole("button", { name: "Weiter" }).click();

  // Schritt 2: Invite-Code
  await page
    .getByLabel("Einladungscode")
    .waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
  await page.getByLabel("Einladungscode").fill(credentials.inviteCode);
  await page.getByRole("button", { name: "Code prüfen" }).click();

  // Schritt 3: Profil (Name)
  await page
    .getByLabel("Anzeigename")
    .waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
  await page.getByLabel("Anzeigename").fill(credentials.displayName);
  await page.getByRole("button", { name: "Weiter" }).click();

  // Schritt 4: UI-Modus
  await page
    .getByText("Aktiver Modus")
    .waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
  if (credentials.uiMode === "senior") {
    await page.getByText("Einfacher Modus").click();
  } else {
    await page.getByText("Aktiver Modus").click();
  }
  await page.getByRole("button", { name: "Registrierung abschließen" }).click();

  // Auf Weiterleitung warten
  if (credentials.uiMode === "senior") {
    await page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
  } else {
    await page.waitForURL("**/welcome**", { timeout: TIMEOUTS.pageLoad });
  }

  console.log(`${prefix} Registrierung abgeschlossen → ${page.url()}`);
}

/**
 * Alle Agenten aufraeumen (Kontexte schliessen).
 */
export async function cleanupAgents(...agents: TestAgent[]): Promise<void> {
  for (const agent of agents) {
    try {
      await agent.context.close();
    } catch {
      // Context bereits geschlossen — ignorieren
    }
  }
}
