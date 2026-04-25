// Nachbar.io — Agent Factory: Erstellt isolierte Browser-Kontexte pro Rolle
import { Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";
import type { AgentCredentials, AgentRole } from "./types";
import { TEST_AGENTS, TEST_MODE_HEADERS, TIMEOUTS } from "./test-config";
import { authFile } from "../helpers/auth-paths";

export interface TestAgent {
  id: string;
  role: AgentRole;
  credentials: AgentCredentials;
  context: BrowserContext;
  page: Page;
  userId?: string;
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
    /** storageState aus auth-setup laden (vermeidet Rate-Limiting) */
    useStorageState?: boolean;
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
    org_admin: "[K]",
    doctor: "[D]",
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

  // storageState aus auth-setup laden (falls vorhanden und angefordert)
  const storagePath = options?.useStorageState ? authFile(agentId) : undefined;
  const hasStorageState = storagePath && fs.existsSync(storagePath);
  if (options?.useStorageState && !hasStorageState) {
    console.warn(
      `[AGENT] storageState fuer ${agentId} nicht gefunden: ${storagePath}`,
    );
  }

  // Eigener Browser-Kontext = eigene Session/Cookies
  const context = await browser.newContext({
    baseURL:
      options?.baseURL || process.env.E2E_BASE_URL || "http://localhost:3000",
    viewport,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    permissions: ["notifications"], // Push-Notifications erlauben
    deviceScaleFactor: 1,
    extraHTTPHeaders: TEST_MODE_HEADERS,
    ...(hasStorageState ? { storageState: storagePath } : {}),
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
    userId: undefined,
    prefix,
  };
}

/**
 * Agent einloggen via Supabase Auth API (direkter Token-Login).
 * Umgeht PILOT_HIDE_PASSWORD_LOGIN — Passwort-UI ist im Pilot ausgeblendet.
 * Setzt voraus, dass der Account bereits existiert (via Seeding).
 */
export async function loginAgent(agent: TestAgent): Promise<void> {
  const { page, credentials, prefix } = agent;

  console.log(
    `${prefix} Login als ${credentials.displayName} (${credentials.email})`,
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY muessen gesetzt sein",
    );
  }

  // Login via Test-API-Route (setzt Session-Cookies via Supabase Server-Client)
  const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
  const testSecret = process.env.E2E_TEST_SECRET || "e2e-test-secret-dev";

  // Erst eine Seite laden damit der Context Cookies empfangen kann
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // CareDisclaimer akzeptieren + AlarmScreen deaktivieren (blockiert sonst Care-Seiten)
  await page.evaluate(() => {
    localStorage.setItem("care_disclaimer_accepted", "true");
    localStorage.setItem("e2e_disable_alarm", "true");
    localStorage.setItem("e2e_skip_onboarding", "true");
  });

  // Onboarding-Redirect verhindern: settings.onboarding_completed via Service-Key sicherstellen
  const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test-Login-API aufrufen mit Retry bei Rate-Limiting (429) oder temporaerem 401
  // Supabase gibt manchmal 401 statt 429 bei IP-basiertem Rate-Limiting zurueck
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const delay = 2000 * attempt; // 2s, 4s, 6s, 8s
      console.log(
        `${prefix} Login-Retry, warte ${delay}ms (Versuch ${attempt + 1}/5)`,
      );
      await page.waitForTimeout(delay);
    }

    const response = await page.request.post(`${baseURL}/api/test/login`, {
      headers: TEST_MODE_HEADERS,
      data: {
        email: credentials.email,
        password: credentials.password,
        secret: testSecret,
      },
    });

    if (response.ok()) {
      const result = await response.json();
      agent.userId = result.userId;
      console.log(`${prefix} Test-Login OK → userId=${result.userId}`);

      // Onboarding-Redirect verhindern
      if (supabaseUrlEnv && serviceKey && result.userId) {
        await fetch(`${supabaseUrlEnv}/rest/v1/users?id=eq.${result.userId}`, {
          method: "PATCH",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ settings: { onboarding_completed: true } }),
        });
      }
      break;
    }

    lastError = await response.text();
    const status = response.status();
    const isRetryable =
      status === 429 ||
      (status === 401 && lastError.includes("Invalid login credentials"));

    if (!isRetryable) {
      throw new Error(
        `${prefix} Test-Login fehlgeschlagen: ${status} ${lastError}`,
      );
    }

    if (attempt === 4) {
      throw new Error(
        `${prefix} Test-Login: Rate-Limit nach 5 Versuchen: ${lastError}`,
      );
    }
  }

  // Kurz warten damit Dev-Server vorherige Requests abschliessen kann
  await page.waitForTimeout(1000);

  // Zur Zielseite navigieren (Cookies aus dem API-Call sind im Context)
  const target =
    credentials.uiMode === "senior" ? "/senior/home" : "/dashboard";
  await page.goto(target, {
    timeout: TIMEOUTS.pageLoad,
    waitUntil: "domcontentloaded",
  });

  if (credentials.uiMode === "senior") {
    await page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
  } else {
    // Dashboard oder /welcome akzeptieren (Onboarding-Redirect moeglich)
    await page.waitForURL(/\/(dashboard|welcome)/, {
      timeout: TIMEOUTS.pageLoad,
    });
    // Falls auf /welcome gelandet, retry nach kurzer Pause
    if (page.url().includes("/welcome")) {
      console.log(`${prefix} auf /welcome gelandet, retry /dashboard...`);
      await page.waitForTimeout(1000);
      await page.goto("/dashboard");
      await page.waitForURL(/\/(dashboard|welcome)/, {
        timeout: TIMEOUTS.pageLoad,
      });
    }
  }

  // AlarmScreen abschalten falls aktiv (Check-in-Wecker blockiert sonst Care-Seiten)
  const ausButton = page.getByText("Aus", { exact: true });
  if (await ausButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await ausButton.click();
    await page.waitForTimeout(500);
    console.log(`${prefix} AlarmScreen abgeschaltet`);
  }

  console.log(`${prefix} Login erfolgreich → ${page.url()}`);
}

/**
 * Agent registrieren via UI (2-Schritt Magic-Link-Flow).
 * Flow: Entry → Invite-Code → Identity (Pilotdaten+Email) → OTP-Bestaetigung
 * Hinweis: Nur fuer Agenten mit gueltigem Invite-Code.
 * OTP-Verifizierung ist in E2E nicht moeglich (kein Zugriff auf E-Mail).
 * Registrierung stoppt bei OTP-Bestaetigung.
 */
export async function registerAgent(agent: TestAgent): Promise<void> {
  const { page, credentials, prefix } = agent;

  console.log(`${prefix} Registrierung als ${credentials.displayName}`);

  await page.goto("/register");

  // Auf Hydration warten
  await page.getByText("Willkommen bei QuartierApp").waitFor({
    state: "visible",
    timeout: TIMEOUTS.pageLoad,
  });
  await page
    .waitForLoadState("networkidle", { timeout: TIMEOUTS.networkIdle })
    .catch(() => {});

  // Schritt 1a: Entry — Invite-Code-Pfad waehlen
  await page.getByText("Ich habe einen Einladungscode").click();

  // Schritt 1b: Invite-Code eingeben
  await page
    .getByLabel("Einladungscode")
    .waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
  await page.getByLabel("Einladungscode").fill(credentials.inviteCode);
  await page.getByRole("button", { name: "Code prüfen" }).click();

  // Schritt 2: Identity (Pilotdaten + E-Mail)
  const nameParts = credentials.displayName.trim().split(/\s+/);
  const firstName = nameParts[0] || credentials.displayName;
  const lastName = nameParts.slice(1).join(" ") || "Test";

  await page
    .getByLabel("Vorname")
    .waitFor({ state: "visible", timeout: TIMEOUTS.pageLoad });
  await page.getByLabel("Vorname").fill(firstName);
  await page.getByLabel("Nachname").fill(lastName);
  await page.getByLabel("Geburtsdatum").fill("1977-04-25");
  await page.getByLabel("E-Mail-Adresse").fill(credentials.email);
  await page.getByRole("button", { name: "Anmelde-Code senden" }).click();

  // OTP-Bestaetigung abwarten (Code eingeben ist in E2E nicht moeglich)
  await page.getByText("Wir haben einen Code an").waitFor({
    state: "visible",
    timeout: TIMEOUTS.pageLoad,
  });

  console.log(`${prefix} Registrierung bis OTP-Bestaetigung → ${page.url()}`);
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
