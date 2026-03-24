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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(`[AUTH] Kein Supabase-Zugang — ${agentId} uebersprungen`);
    return;
  }

  // Direkt-Login via Supabase Auth API
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(
      `[AUTH] ${agentId} Login fehlgeschlagen: ${res.status} ${text}`,
    );
    return;
  }

  const session = await res.json();
  if (!session.access_token) {
    console.warn(`[AUTH] ${agentId} Kein Access-Token erhalten`);
    return;
  }

  // Session via Cookies injizieren (Supabase SSR liest Cookies, nicht localStorage)
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;

  const sessionPayload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: "bearer",
    expires_in: session.expires_in || 3600,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
    user: session.user,
  });

  // Chunks: max ~3500 Zeichen pro Cookie (URL-encoded JSON)
  const chunkSize = 3500;
  const chunks: string[] = [];
  for (let i = 0; i < sessionPayload.length; i += chunkSize) {
    chunks.push(sessionPayload.slice(i, i + chunkSize));
  }

  const cookies = chunks.map((chunk, i) => ({
    name: chunks.length === 1 ? cookieBase : `${cookieBase}.${i}`,
    value: chunk,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));

  await page.context().addCookies(cookies);

  // Navigieren und pruefen
  await page.goto("/dashboard");
  await page.waitForURL(expectedUrlPattern, { timeout: TIMEOUTS.pageLoad });
  console.log(`[AUTH] ${agentId} eingeloggt → ${page.url()}`);

  // Auth-State speichern
  await page.context().storageState({ path: authFile(agentId) });
  console.log(`[AUTH] storageState gespeichert: .auth/${agentId}.json`);
}
