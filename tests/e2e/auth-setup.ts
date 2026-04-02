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
      data: { email, password, secret: testSecret },
    });

    if (response.ok()) {
      result = await response.json();
      break;
    }

    const status = response.status();
    const text = await response.text();

    // 404 = Route existiert nicht auf Production → Supabase-direkt Fallback
    if (status === 404) {
      console.log(
        `[AUTH] ${agentId} /api/test/login nicht verfuegbar (404) → Supabase-Direkt-Auth`,
      );
      useSupabaseDirect = true;
      break;
    }

    const isRetryable =
      status === 429 ||
      (status === 401 && text.includes("Invalid login credentials"));

    if (!isRetryable || attempt === 4) {
      console.warn(`[AUTH] ${agentId} Login fehlgeschlagen: ${status} ${text}`);
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

    // Projekt-Referenz aus der URL extrahieren (z.B. "uylszchlyhbpbmslcnka")
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    // Token in Browser-localStorage injizieren
    await page.evaluate(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      { key: storageKey, value: JSON.stringify(authData) },
    );

    // Supabase SSR-Cookies setzen (Middleware liest Cookies, nicht localStorage)
    // Cookie-Format: JSON-Chunks (max 3500 Bytes pro Chunk)
    const sessionJson = JSON.stringify(authData);
    const chunkSize = 3500;
    const chunks = [];
    for (let i = 0; i < sessionJson.length; i += chunkSize) {
      chunks.push(sessionJson.slice(i, i + chunkSize));
    }
    const baseUrl = new URL(page.url());
    const cookieBase = {
      domain: baseUrl.hostname,
      path: "/",
      httpOnly: false,
      secure: baseUrl.protocol === "https:",
      sameSite: "Lax" as const,
    };
    if (chunks.length === 1) {
      await page.context().addCookies([
        {
          ...cookieBase,
          name: storageKey,
          value: `base64-${btoa(chunks[0])}`,
        },
      ]);
    } else {
      const cookies = chunks.map((chunk, i) => ({
        ...cookieBase,
        name: `${storageKey}.${i}`,
        value: `base64-${btoa(chunk)}`,
      }));
      await page.context().addCookies(cookies);
    }

    console.log(
      `[AUTH] ${agentId} Supabase-Token injiziert (${storageKey}, ${chunks.length} Cookie-Chunks) → userId=${result.userId}`,
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
