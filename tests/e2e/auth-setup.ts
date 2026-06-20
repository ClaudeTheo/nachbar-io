// Nachbar.io — Auth Setup: Einmalig einloggen, storageState fuer alle Agenten speichern
// Playwright fuehrt dieses Setup VOR authentifizierten Tests aus.
// Jeder Agent bekommt eine eigene .auth/<agentId>.json Datei.
import { test as setup } from "@playwright/test";
import * as fs from "fs";
import { TEST_AGENTS, TEST_MODE_HEADERS, TIMEOUTS } from "./helpers/test-config";
import { AUTH_DIR, authFile } from "./helpers/auth-paths";
import {
  buildSupabaseSessionCookies,
  getSupabaseStorageKey,
} from "./helpers/supabase-auth-cookie";

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
    /\/(kreis-start|senior|dashboard|welcome)/,
  );
});

// --- Agent T: Betreuer (fuer Senior-Terminal Tests S5) ---
setup("Auth: betreuer_t einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.betreuer_t;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "betreuer_t",
    /\/(dashboard|welcome)/,
  );
});

// --- Agent D: Arzt (Pro Medical, Cross-Portal Termin-Tests) ---
setup("Auth: arzt_d einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.arzt_d;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "arzt_d",
    /\/(dashboard|welcome|termine)/,
  );
});

// --- Agent P: Pflegedienst (Pro Community, Cross-Portal Pflege-Tests) ---
setup("Auth: pflege_p einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.pflege_p;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "pflege_p",
    /\/(dashboard|welcome)/,
  );
});

// --- Agent K: Kommune/Rathaus (Pro Community, Cross-Portal Civic-Tests) ---
setup("Auth: stadt_k einloggen", async ({ page }) => {
  const agent = TEST_AGENTS.stadt_k;
  await loginAndSave(
    page,
    agent.email,
    agent.password,
    "stadt_k",
    /\/(dashboard|welcome|admin)/,
  );
});

/**
 * Loggt einen Agenten ein und speichert den storageState.
 * Strategie 1: /api/test/login (lokaler Dev-Server)
 * Strategie 2: Supabase Auth API direkt (Live/Vercel — /api/test/login gibt 404)
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  await page.context().setExtraHTTPHeaders(TEST_MODE_HEADERS);

  // Erst eine Seite laden damit Cookies empfangen werden koennen
  await page.goto("/login");
  await page.waitForLoadState("networkidle").catch(() => {});

  // E2E-Flags setzen (muss VOR dem Login passieren)
  await page.evaluate(() => {
    localStorage.setItem("care_disclaimer_accepted", "true");
    localStorage.setItem("e2e_disable_alarm", "true");
    localStorage.setItem("e2e_skip_onboarding", "true");
  });

  // --- Strategie 1: /api/test/login (Dev-Server) ---
  let result: { userId?: string } = {};
  let useSupabaseDirect = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const delay = 2000 * attempt;
      console.log(
        `[AUTH] ${agentId} Login-Retry, warte ${delay}ms (Versuch ${attempt + 1}/5)`,
      );
      await page.waitForTimeout(delay);
    }

    const response = await page.request.post(`${baseURL}/api/test/login`, {
      headers: TEST_MODE_HEADERS,
      data: { email, password, secret: testSecret },
    });

    if (response.ok()) {
      result = await response.json();
      break;
    }

    const status = response.status();
    const text = await response.text();

    // 404 = Route existiert nicht auf Production → Supabase-direkt Fallback
    if (status === 404 || (status === 503 && text.includes("closed_pilot"))) {
      console.log(
        `[AUTH] ${agentId} /api/test/login nicht verfuegbar (404) → Supabase-Direkt-Auth`,
      );
      useSupabaseDirect = true;
      break;
    }

    // 429 = Rate-Limit → Retry; 401 = Credentials falsch → 2 Retries, dann Supabase-Direkt
    const isRetryable =
      status === 429 ||
      (status === 401 && text.includes("Invalid login credentials"));

    if (!isRetryable) {
      console.warn(`[AUTH] ${agentId} Login fehlgeschlagen: ${status} ${text}`);
      return;
    }

    // Nach 2 fehlgeschlagenen 401-Retries: Supabase-Direkt-Fallback
    if (status === 401 && attempt >= 2) {
      console.log(
        `[AUTH] ${agentId} Test-Login 401 nach ${attempt + 1} Versuchen → Supabase-Direkt-Auth`,
      );
      useSupabaseDirect = true;
      break;
    }

    if (attempt === 4) {
      console.warn(
        `[AUTH] ${agentId} Login fehlgeschlagen nach 5 Versuchen: ${status} ${text}`,
      );
      return;
    }
  }

  // --- Strategie 2: Supabase Auth API direkt (Live-Modus) ---
  if (useSupabaseDirect) {
    if (!supabaseUrl || !anonKey) {
      console.warn(
        `[AUTH] ${agentId} Supabase-Direkt-Auth nicht moeglich: NEXT_PUBLIC_SUPABASE_URL oder ANON_KEY fehlt`,
      );
      return;
    }

    // Supabase Auth REST API: signInWithPassword
    const authResp = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
    );

    if (!authResp.ok) {
      const errText = await authResp.text();
      console.warn(
        `[AUTH] ${agentId} Supabase-Direkt-Auth fehlgeschlagen: ${authResp.status} ${errText}`,
      );
      return;
    }

    const authData = await authResp.json();
    result.userId = authData.user?.id;

    const storageKey = getSupabaseStorageKey(supabaseUrl);

    // Token in Browser-localStorage injizieren
    await page.evaluate(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      { key: storageKey, value: JSON.stringify(authData) },
    );

    const sessionJson = JSON.stringify(authData);
    const cookies = buildSupabaseSessionCookies({
      storageKey,
      sessionJson,
      currentUrl: page.url(),
    });
    await page.context().addCookies(cookies);

    console.log(
      `[AUTH] ${agentId} Supabase-Token injiziert (${storageKey}, ${cookies.length} Cookie-Chunks) → userId=${result.userId}`,
    );

    // Seite neu laden damit Middleware die Cookies liest
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
  }

  if (!useSupabaseDirect) {
    console.log(`[AUTH] ${agentId} Test-Login OK → userId=${result.userId}`);
  }

  // Onboarding-Redirect verhindern: settings.onboarding_completed via Service-Key
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
  await page.goto("/dashboard", {
    timeout: TIMEOUTS.pageLoad,
    waitUntil: "domcontentloaded",
  });
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
