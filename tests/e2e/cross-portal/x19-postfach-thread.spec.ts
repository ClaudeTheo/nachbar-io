// X19: OZG-Civic Postfach — Vollstaendiger Buerger↔Rathaus Thread
//
// Prueft den kompletten bidirektionalen Flow ueber beide Portale:
// 1. Buerger erstellt Nachricht (io) → Thread entsteht
// 2. Rathaus sieht Thread in Inbox (civic) → awaiting_reply
// 3. Rathaus antwortet (civic)
// 4. Buerger sieht Antwort + Unread (io)
// 5. Buerger markiert als gelesen (io) → Unread verschwindet
// 6. Buerger antwortet (io)
// 7. Rathaus sieht Buerger-Antwort (civic) → awaiting_reply wieder true
//
// Self-Contained: Authentifiziert sich direkt via Supabase Auth API.
// Keine Abhaengigkeit von auth-setup oder vorgenerierten State-Files.

import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from "@playwright/test";
import { portalUrl } from "../helpers/portal-urls";

// Test-Accounts (existieren in Production-Supabase)
const CITIZEN_EMAIL = "helga.brunner@nachbar-test.de";
const STAFF_EMAIL = "markus.weber@nachbar-test.de";
const PASSWORD = "LiveTest2026!";

// Security-Bypass Header (muss mit SECURITY_E2E_BYPASS auf Vercel uebereinstimmen)
const TEST_MODE_HEADER = {
  "x-nachbar-test-mode":
    process.env.SECURITY_E2E_BYPASS || "e2e-test-secret-dev",
};

// Eindeutiger Marker pro Testlauf
const TEST_MARKER = `E2E-Postfach-${Date.now()}`;
const TEST_SUBJECT = `${TEST_MARKER} Gehweg kaputt`;
const TEST_BODY_CITIZEN =
  "Der Gehweg in der Purkersdorfer Strasse hat mehrere gefaehrliche Stolperfallen. Bitte um Pruefung.";
const TEST_BODY_STAFF =
  "Vielen Dank fuer Ihre Meldung. Wir haben den Bauhof informiert und die Reparatur wird naechste Woche durchgefuehrt.";
const TEST_BODY_CITIZEN_REPLY =
  "Vielen Dank fuer die schnelle Rueckmeldung. Ich freue mich auf die Reparatur.";

/**
 * Authentifiziert einen User via Supabase Auth und erstellt einen BrowserContext
 * mit gueltigem Token (Cookies + localStorage fuer alle Portal-Domains).
 */
async function createAuthContext(
  browser: import("@playwright/test").Browser,
  email: string,
): Promise<BrowserContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY muessen gesetzt sein",
    );
  }

  // Supabase Auth: signInWithPassword
  const authResp = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    },
  );

  if (!authResp.ok) {
    const errText = await authResp.text();
    throw new Error(
      `Auth fehlgeschlagen fuer ${email}: ${authResp.status} ${errText}`,
    );
  }

  const authData = await authResp.json();
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const sessionJson = JSON.stringify(authData);

  // BrowserContext mit Desktop-Viewport
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  });

  // Supabase-Token per Cookie + localStorage auf allen Portal-Domains injizieren
  const portals = [
    {
      domain: new URL(portalUrl("io", "/")).hostname,
      secure: portalUrl("io", "/").startsWith("https"),
    },
    {
      domain: new URL(portalUrl("civic", "/")).hostname,
      secure: portalUrl("civic", "/").startsWith("https"),
    },
  ];

  // Cookie-Chunks (max 3500 Bytes pro Chunk fuer SSR-Middleware)
  const chunkSize = 3500;
  const chunks: string[] = [];
  for (let i = 0; i < sessionJson.length; i += chunkSize) {
    chunks.push(sessionJson.slice(i, i + chunkSize));
  }

  for (const portal of portals) {
    if (chunks.length === 1) {
      await ctx.addCookies([
        {
          name: storageKey,
          value: `base64-${Buffer.from(chunks[0]).toString("base64")}`,
          domain: portal.domain,
          path: "/",
          httpOnly: false,
          secure: portal.secure,
          sameSite: "Lax",
        },
      ]);
    } else {
      const cookies = chunks.map((chunk, i) => ({
        name: `${storageKey}.${i}`,
        value: `base64-${Buffer.from(chunk).toString("base64")}`,
        domain: portal.domain,
        path: "/",
        httpOnly: false,
        secure: portal.secure,
        sameSite: "Lax" as const,
      }));
      await ctx.addCookies(cookies);
    }
  }

  // localStorage: Supabase-Token + E2E-Flags auf jeder Origin
  await ctx.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        localStorage.setItem(key, value);
        localStorage.setItem("e2e_disable_alarm", "true");
        localStorage.setItem("e2e_skip_onboarding", "true");
        localStorage.setItem("care_disclaimer_accepted", "true");
      } catch {
        /* about:blank */
      }
    },
    { key: storageKey, value: sessionJson },
  );

  return ctx;
}

test.describe("X19: OZG-Civic Postfach — Buerger↔Rathaus Thread", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  // Geteilter State
  let threadId: string | null = null;
  let citizenCtx: BrowserContext | null = null;
  let staffCtx: BrowserContext | null = null;
  let citizenApi: APIRequestContext;
  let staffApi: APIRequestContext;

  test.beforeAll(async ({ browser }) => {
    citizenCtx = await createAuthContext(browser, CITIZEN_EMAIL);
    staffCtx = await createAuthContext(browser, STAFF_EMAIL);

    // API-Request-Contexts (tragen die Cookies des jeweiligen Users)
    const citizenPage = await citizenCtx.newPage();
    await citizenPage.goto(portalUrl("io", "/dashboard"));
    await citizenPage.waitForLoadState("domcontentloaded");
    citizenApi = citizenPage.request;

    const staffPage = await staffCtx.newPage();
    await staffPage.goto(portalUrl("civic", "/dashboard"));
    await staffPage.waitForLoadState("domcontentloaded");
    staffApi = staffPage.request;
  });

  test.afterAll(async () => {
    await citizenCtx?.close();
    await staffCtx?.close();
  });

  // ── Phase 1: Buerger erstellt Thread ──────────────────────────
  test("x19a: Buerger erstellt Nachricht an Rathaus", async () => {
    const resp = await citizenApi.post(portalUrl("io", "/api/postfach"), {
      headers: TEST_MODE_HEADER,
      data: { subject: TEST_SUBJECT, body: TEST_BODY_CITIZEN },
    });

    expect(resp.status()).toBe(201);

    const json = await resp.json();
    expect(json.message).toBeDefined();
    expect(json.message.id).toBeTruthy();
    expect(json.message.subject).toBe(TEST_SUBJECT);
    expect(json.org_name).toBeTruthy();

    threadId = json.message.id;
    console.log(`[x19a] Thread erstellt: ${threadId}, Org: ${json.org_name}`);
  });

  // ── Phase 2: Rathaus sieht Thread ─────────────────────────────
  test("x19b: Rathaus sieht Thread in Inbox (awaiting_reply)", async () => {
    expect(threadId).toBeTruthy();

    const resp = await staffApi.get(portalUrl("civic", "/api/postfach"), {
      headers: TEST_MODE_HEADER,
    });
    expect(resp.status()).toBe(200);

    const threads = await resp.json();
    expect(Array.isArray(threads)).toBe(true);

    const ourThread = threads.find((t: { id: string }) => t.id === threadId);
    expect(ourThread).toBeDefined();
    expect(ourThread.subject).toBe(TEST_SUBJECT);
    expect(ourThread.reply_count).toBe(0);
    // Neuer Thread: status="sent" (ungelesen) → awaiting_reply=false
    // awaiting_reply wird erst true nach read ODER bei citizen-Antwort
    expect(ourThread.awaiting_reply).toBe(false);

    console.log(
      `[x19b] Thread in Civic-Inbox: ${ourThread.subject}, status=${ourThread.status}`,
    );
  });

  // ── Phase 3: Rathaus antwortet ────────────────────────────────
  test("x19c: Rathaus antwortet im Thread", async () => {
    expect(threadId).toBeTruthy();

    const resp = await staffApi.post(
      portalUrl("civic", `/api/postfach/${threadId}/antwort`),
      { headers: TEST_MODE_HEADER, data: { body: TEST_BODY_STAFF } },
    );

    expect(resp.status()).toBe(201);

    const json = await resp.json();
    expect(json.message).toBeDefined();
    expect(json.message.id).toBeTruthy();

    console.log(`[x19c] Staff-Antwort: ${json.message.id}`);
  });

  // ── Phase 4: Buerger sieht Antwort + Unread ───────────────────
  test("x19d: Buerger sieht Antwort mit Unread-Badge", async () => {
    expect(threadId).toBeTruthy();

    // Thread-Liste: unread_count > 0
    const listResp = await citizenApi.get(portalUrl("io", "/api/postfach"), {
      headers: TEST_MODE_HEADER,
    });
    expect(listResp.status()).toBe(200);

    const threads = await listResp.json();
    const ourThread = threads.find((t: { id: string }) => t.id === threadId);
    expect(ourThread).toBeDefined();
    expect(ourThread.unread_count).toBeGreaterThanOrEqual(1);

    console.log(`[x19d] Unread-Count: ${ourThread.unread_count}`);

    // Thread-Detail: 2 Nachrichten, Entschluesselung OK
    const detailResp = await citizenApi.get(
      portalUrl("io", `/api/postfach/${threadId}`),
      { headers: TEST_MODE_HEADER },
    );
    expect(detailResp.status()).toBe(200);

    const detail = await detailResp.json();
    expect(detail.messages).toHaveLength(2);
    expect(detail.messages[0].direction).toBe("citizen_to_staff");
    expect(detail.messages[1].direction).toBe("staff_to_citizen");
    // Body entschluesselt (kein Base64-String)
    expect(detail.messages[1].body).toBeTruthy();
    expect(detail.messages[1].body).not.toMatch(/^[A-Za-z0-9+/=]{50,}$/);

    console.log(
      `[x19d] Detail: ${detail.messages.length} Nachrichten, Entschluesselung OK`,
    );
  });

  // ── Phase 5: Buerger markiert als gelesen ─────────────────────
  test("x19e: Buerger markiert Thread als gelesen", async () => {
    expect(threadId).toBeTruthy();

    const patchResp = await citizenApi.patch(
      portalUrl("io", `/api/postfach/${threadId}`),
      { headers: TEST_MODE_HEADER },
    );
    expect(patchResp.status()).toBe(200);

    const patchJson = await patchResp.json();
    expect(patchJson.marked).toBe(true);

    // Verifizieren: unread_count = 0
    const listResp = await citizenApi.get(portalUrl("io", "/api/postfach"), {
      headers: TEST_MODE_HEADER,
    });
    const threads = await listResp.json();
    const ourThread = threads.find((t: { id: string }) => t.id === threadId);
    expect(ourThread).toBeDefined();
    expect(ourThread.unread_count).toBe(0);

    console.log("[x19e] Read-Marker gesetzt, Unread = 0");
  });

  // ── Phase 6: Buerger antwortet ────────────────────────────────
  test("x19f: Buerger antwortet im Thread", async () => {
    expect(threadId).toBeTruthy();

    const resp = await citizenApi.post(
      portalUrl("io", `/api/postfach/${threadId}/antwort`),
      { headers: TEST_MODE_HEADER, data: { body: TEST_BODY_CITIZEN_REPLY } },
    );

    expect(resp.status()).toBe(201);

    const json = await resp.json();
    expect(json.message).toBeDefined();
    expect(json.message.id).toBeTruthy();

    console.log(`[x19f] Buerger-Antwort: ${json.message.id}`);
  });

  // ── Phase 7: Rathaus sieht Buerger-Antwort ────────────────────
  test("x19g: Rathaus sieht Buerger-Antwort (3 Nachrichten)", async () => {
    expect(threadId).toBeTruthy();

    // Thread-Detail: 3 Nachrichten (citizen → staff → citizen)
    const detailResp = await staffApi.get(
      portalUrl("civic", `/api/postfach/${threadId}`),
      { headers: TEST_MODE_HEADER },
    );
    expect(detailResp.status()).toBe(200);

    const detail = await detailResp.json();
    expect(detail.messages).toHaveLength(3);
    expect(detail.messages[0].direction).toBe("citizen_to_staff");
    expect(detail.messages[1].direction).toBe("staff_to_citizen");
    expect(detail.messages[2].direction).toBe("citizen_to_staff");

    // Letzte Nachricht entschluesselt
    expect(detail.messages[2].body).toBeTruthy();
    expect(detail.messages[2].body).not.toMatch(/^[A-Za-z0-9+/=]{50,}$/);

    console.log(
      `[x19g] Civic-Thread: ${detail.messages.length} Nachrichten, Reihenfolge korrekt`,
    );

    // Inbox: awaiting_reply = true
    const listResp = await staffApi.get(portalUrl("civic", "/api/postfach"));
    const threads = await listResp.json();
    const ourThread = threads.find((t: { id: string }) => t.id === threadId);
    expect(ourThread).toBeDefined();
    expect(ourThread.awaiting_reply).toBe(true);
    expect(ourThread.reply_count).toBeGreaterThanOrEqual(2);

    console.log(
      `[x19g] awaiting_reply=${ourThread.awaiting_reply}, replies=${ourThread.reply_count}`,
    );
  });
});
