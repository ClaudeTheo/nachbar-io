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

  const testSecret = process.env.E2E_TEST_SECRET || "e2e-test-secret-dev";

  // Erst eine Seite laden damit Cookies empfangen werden koennen
  await page.goto("/login");

  // Test-Login-API aufrufen via Browser-Fetch (NICHT page.request.post!)
  // page.request.post() setzt Cookies nur im HTTP-Context, nicht in document.cookie.
  // AuthSessionProvider.getSession() braucht document.cookie um die Session zu finden.
  const result = await page.evaluate(
    async ({ email: e, password: p, secret: s }) => {
      const response = await fetch("/api/test/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p, secret: s }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const text = await response.text();
        return { error: `${response.status} ${text}` };
      }

      return await response.json();
    },
    { email, password, secret: testSecret },
  );

  if (result.error) {
    console.warn(`[AUTH] ${agentId} Login fehlgeschlagen: ${result.error}`);
    return;
  }

  console.log(`[AUTH] ${agentId} Test-Login OK → userId=${result.userId}`);

  // Zur Zielseite navigieren
  await page.goto("/dashboard");
  await page.waitForURL(expectedUrlPattern, { timeout: TIMEOUTS.pageLoad });
  console.log(`[AUTH] ${agentId} eingeloggt → ${page.url()}`);

  // Auth-State speichern
  await page.context().storageState({ path: authFile(agentId) });
  console.log(`[AUTH] storageState gespeichert: .auth/${agentId}.json`);
}
