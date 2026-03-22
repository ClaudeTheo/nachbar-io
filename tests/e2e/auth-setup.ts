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
  await loginAndSave(page, agent.email, agent.password, "nachbar_a", /\/(dashboard|welcome)/);
});

// --- Agent B: Helfer (aktiver Modus) ---
setup("Auth: helfer_b einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.helfer_b;
  await loginAndSave(page, agent.email, agent.password, "helfer_b", /\/(dashboard|welcome)/);
});

// --- Agent M: Moderator/Admin ---
setup("Auth: moderator_m einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.moderator_m;
  await loginAndSave(page, agent.email, agent.password, "moderator_m", /\/(dashboard|welcome|admin)/);
});

// --- Agent S: Senior ---
setup("Auth: senior_s einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.senior_s;
  await loginAndSave(page, agent.email, agent.password, "senior_s", /\/(senior|dashboard|welcome)/);
});

/**
 * Loggt einen Agenten via Passwort ein und speichert den storageState.
 * Verwendet denselben Login-Flow wie die Login-Page (Passwort-Fallback).
 */
async function loginAndSave(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  agentId: string,
  expectedUrlPattern: RegExp
) {
  console.log(`[AUTH] Login ${agentId} (${email})...`);

  await page.goto("/login");
  await page.getByText("Anmelden", { exact: true }).first().waitFor({
    state: "visible",
    timeout: TIMEOUTS.pageLoad,
  });

  // Zum Passwort-Modus wechseln
  await page.getByText("Stattdessen mit Passwort anmelden").click();
  await page.getByLabel("Passwort").waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });

  // Credentials eingeben
  await page.locator("#email-pw").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Auf Redirect warten
  await page.waitForURL(expectedUrlPattern, { timeout: TIMEOUTS.pageLoad });
  console.log(`[AUTH] ${agentId} eingeloggt → ${page.url()}`);

  // Auth-State speichern
  await page.context().storageState({ path: authFile(agentId) });
  console.log(`[AUTH] storageState gespeichert: .auth/${agentId}.json`);
}
