// Nachbar.io — Auth Setup: Einmalig einloggen, storageState fuer alle Agenten speichern
// Playwright fuehrt dieses Setup VOR authentifizierten Tests aus.
// Jeder Agent bekommt eine eigene .auth/<agentId>.json Datei.
import { test as setup } from "@playwright/test";
import * as fs from "fs";
import { TEST_AGENTS, TIMEOUTS } from "./helpers/test-config";
import { AUTH_DIR, authFile } from "./helpers/auth-paths";

// Re-export fuer Abwaertskompatibilitaet
export { authFile, AUTH_DIR };

// Verzeichnis erstellen falls noetig
setup.beforeAll(async () => {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
});

// --- Agent A: Nachbar (aktiver Modus) ---
setup("Auth: nachbar_a einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.nachbar_a;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "nachbar_a",
    /\/(dashboard|welcome)/,
  );
});

// --- Agent B: Helfer (aktiver Modus) ---
setup("Auth: helfer_b einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.helfer_b;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "helfer_b",
    /\/(dashboard|welcome)/,
  );
});

// --- Agent M: Moderator/Admin ---
setup("Auth: moderator_m einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.moderator_m;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "moderator_m",
    /\/(dashboard|welcome|admin)/,
  );
});

// --- Agent S: Senior ---
setup("Auth: senior_s einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.senior_s;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "senior_s",
    /\/(senior|dashboard|welcome)/,
  );
});

/**
 * Loggt einen Agenten via Supabase Auth API ein und speichert den storageState.
 * Umgeht PILOT_HIDE_PASSWORD_LOGIN — Passwort-UI ist im Pilot ausgeblendet.
 */
async function loginAndSave(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  agentId: string,
  expectedUrlPattern: RegExp,
) {
  console.log(`[AUTH] Login ${agentId} (${email})...`);

  const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
  const testSecret = process.env.E2E_TEST_SECRET || "e2e-test-secret-dev";

  // Erst eine Seite laden damit Cookies empfangen werden koennen
  // Zuerst /login laden, dann auf Stabilisierung warten (Redirect moeglich)
  await page.goto("/login");
  await page.waitForLoadState("networkidle").catch(() => {});

  // CareDisclaimer akzeptieren + AlarmScreen deaktivieren + Onboarding-Skip
  // (muss VOR dem Login gesetzt werden, damit storageState alle Flags enthaelt)
  await page.evaluate(() => {
    localStorage.setItem("care_disclaimer_accepted", "true");
    localStorage.setItem("e2e_disable_alarm", "true");
    localStorage.setItem("e2e_skip_onboarding", "true");
  });

  // Test-Login-API aufrufen mit Retry bei Rate-Limiting (429)
  let result: { userId?: string } = {};
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const delay = 2000 * attempt;
      console.log(
        `[AUTH] ${agentId} Rate-Limited, warte ${delay}ms (Versuch ${attempt + 1}/5)`,
      );
      await page.waitForTimeout(delay);
    }

    const response = await page.request.post(`${baseURL}/api/test/login`, {
      data: { email, password, secret: testSecret },
    });

    if (response.ok()) {
      result = await response.json();
      break;
    }

    const text = await response.text();
    if (response.status() !== 429 || attempt === 4) {
      console.warn(
        `[AUTH] ${agentId} Login fehlgeschlagen: ${response.status()} ${text}`,
      );
      return;
    }
  }
  console.log(`[AUTH] ${agentId} Test-Login OK → userId=${result.userId}`);

  // Onboarding-Redirect verhindern: settings.onboarding_completed via Service-Key sicherstellen
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey && result.userId) {
    await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${result.userId}`, {
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

  // Zur Zielseite navigieren
  await page.goto("/dashboard");
  await page.waitForURL(expectedUrlPattern, { timeout: TIMEOUTS.pageLoad });

  // Falls auf /welcome gelandet, nochmal /dashboard versuchen (Session-Race)
  if (page.url().includes("/welcome")) {
    console.log(`[AUTH] ${agentId} auf /welcome gelandet, retry /dashboard...`);
    await page.waitForTimeout(1000);
    await page.goto("/dashboard");
    await page.waitForURL(expectedUrlPattern, { timeout: TIMEOUTS.pageLoad });
  }
  console.log(`[AUTH] ${agentId} eingeloggt → ${page.url()}`);

  // Auth-State speichern
  await page.context().storageState({ path: authFile(agentId) });
  console.log(`[AUTH] storageState gespeichert: .auth/${agentId}.json`);
}
