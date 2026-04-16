// Nachbar.io — Rollenbasierte Playwright-Fixtures mit test.extend
// Jede Fixture erzeugt einen isolierten BrowserContext mit vorgeladenem Auth-State.
// localStorage-Keys werden direkt nach Kontext-Erstellung gesetzt, um Onboarding-Screens
// und Alarm-Sounds in der E2E-Umgebung zu unterdruecken.
// Cross-Portal Auth: Supabase-Token wird per addInitScript auf JEDER Origin injiziert,
// damit Tests gegen verschiedene Vercel-Domains (nachbar-io, nachbar-arzt etc.) funktionieren.
import { test as base } from "@playwright/test";
import * as fs from "fs";
import {
  ResidentPage,
  CaregiverPage,
  ArztPage,
  PflegePage,
  OrgAdminPage,
} from "./types";
import { authFile } from "../helpers/auth-paths";
import { PORTAL_URLS } from "../helpers/portal-urls";
import { TEST_MODE_HEADERS } from "../helpers/test-config";

/** Typ-Map aller Rollen-Fixtures */
type RoleFixtures = {
  residentPage: ResidentPage;
  caregiverPage: CaregiverPage;
  arztPage: ArztPage;
  pflegePage: PflegePage;
  orgAdminPage: OrgAdminPage;
};

/** Supabase localStorage-Eintraege aus storageState-Datei extrahieren */
function extractSupabaseTokens(
  storageStatePath: string,
): Array<{ name: string; value: string }> {
  try {
    const state = JSON.parse(fs.readFileSync(storageStatePath, "utf-8"));
    const tokens: Array<{ name: string; value: string }> = [];
    for (const origin of state.origins || []) {
      for (const entry of origin.localStorage || []) {
        // Alle Supabase-Keys mitnehmen (sb-*-auth-token, sb-*-code-verifier etc.)
        if (entry.name.startsWith("sb-")) {
          tokens.push({ name: entry.name, value: entry.value });
        }
      }
    }
    return tokens;
  } catch {
    return [];
  }
}

/** Supabase-Cookies aus storageState fuer alle Portal-Domains duplizieren.
 *  Cookies sind domain-spezifisch — ein Cookie fuer nachbar-io.vercel.app wird
 *  nicht an nachbar-arzt.vercel.app gesendet. Diese Funktion kopiert die
 *  Supabase-Auth-Cookies auf alle konfigurierten Portal-Domains. */
async function duplicateAuthCookies(
  ctx: import("@playwright/test").BrowserContext,
  storageStatePath: string,
) {
  try {
    const state = JSON.parse(fs.readFileSync(storageStatePath, "utf-8"));
    const sbCookies = (state.cookies || []).filter((c: { name: string }) =>
      c.name.startsWith("sb-"),
    );
    if (sbCookies.length === 0) return;

    // Alle Portal-Domains ermitteln
    const portalDomains = Object.values(PORTAL_URLS)
      .map((url) => {
        try {
          const parsed = new URL(url);
          return {
            domain: parsed.hostname,
            secure: parsed.protocol === "https:",
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ domain: string; secure: boolean }>;

    // Fuer jede Portal-Domain die Supabase-Cookies duplizieren
    for (const portal of portalDomains) {
      const cookies = sbCookies.map(
        (c: {
          name: string;
          value: string;
          path?: string;
          expires?: number;
          httpOnly?: boolean;
          sameSite?: string;
        }) => ({
          name: c.name,
          value: c.value,
          domain: portal.domain,
          path: c.path || "/",
          expires: c.expires || -1,
          httpOnly: c.httpOnly ?? false,
          secure: portal.secure,
          sameSite: (c.sameSite as "Lax" | "Strict" | "None") || "Lax",
        }),
      );
      await ctx.addCookies(cookies);
    }
  } catch {
    // storageState nicht lesbar — kein Problem, Tests nutzen Fallback-Assertions
  }
}

/** Helper: addInitScript fuer localStorage-Flags + Supabase-Token-Injection
 *  (laeuft bei jeder Navigation auf jeder Origin — Cross-Portal-Auth) */
async function addE2eFlags(
  ctx: import("@playwright/test").BrowserContext,
  storageStatePath: string,
  includeCare = false,
) {
  const supabaseTokens = extractSupabaseTokens(storageStatePath);

  // 1. localStorage-Injection per addInitScript (fuer jede Origin)
  await ctx.addInitScript(
    ({
      includeCare: ic,
      tokens,
    }: {
      includeCare: boolean;
      tokens: Array<{ name: string; value: string }>;
    }) => {
      try {
        // E2E-Flags
        localStorage.setItem("e2e_disable_alarm", "true");
        localStorage.setItem("e2e_skip_onboarding", "true");
        if (ic) localStorage.setItem("care_disclaimer_accepted", "true");
        // Supabase-Auth-Token auf jeder Origin injizieren
        for (const t of tokens) {
          localStorage.setItem(t.name, t.value);
        }
      } catch {
        /* about:blank — ignorieren */
      }
    },
    { includeCare, tokens: supabaseTokens },
  );

  // 2. Cookies fuer alle Portal-Domains duplizieren (Middleware liest Cookies)
  await duplicateAuthCookies(ctx, storageStatePath);
}

export const test = base.extend<RoleFixtures>({
  // --- Bewohner (Nachbar Free, Senior-Modus, Pixel-5-Viewport) ---
  residentPage: async ({ browser }, use) => {
    const stateFile = authFile("senior_s");
    const ctx = await browser.newContext({
      storageState: stateFile,
      viewport: { width: 393, height: 851 }, // Pixel 5
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      extraHTTPHeaders: TEST_MODE_HEADERS,
    });
    await addE2eFlags(ctx, stateFile, true);
    const page = await ctx.newPage();
    await use(new ResidentPage(page));
    await ctx.close();
  },

  // --- Angehoeriger/Betreuer (Nachbar Plus, Desktop-Viewport) ---
  caregiverPage: async ({ browser }, use) => {
    const stateFile = authFile("betreuer_t");
    const ctx = await browser.newContext({
      storageState: stateFile,
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      extraHTTPHeaders: TEST_MODE_HEADERS,
    });
    await addE2eFlags(ctx, stateFile, true);
    const page = await ctx.newPage();
    await use(new CaregiverPage(page));
    await ctx.close();
  },

  // --- Arzt (Nachbar Pro Medical, Desktop-Viewport) ---
  arztPage: async ({ browser }, use) => {
    const stateFile = authFile("arzt_d");
    const ctx = await browser.newContext({
      storageState: stateFile,
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      extraHTTPHeaders: TEST_MODE_HEADERS,
    });
    await addE2eFlags(ctx, stateFile);
    const page = await ctx.newPage();
    await use(new ArztPage(page));
    await ctx.close();
  },

  // --- Pflegedienst (nachbar-pflege, Org-Admin Pflege-Typ, Desktop-Viewport) ---
  pflegePage: async ({ browser }, use) => {
    const stateFile = authFile("pflege_p");
    const ctx = await browser.newContext({
      storageState: stateFile,
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      extraHTTPHeaders: TEST_MODE_HEADERS,
    });
    await addE2eFlags(ctx, stateFile);
    const page = await ctx.newPage();
    await use(new PflegePage(page));
    await ctx.close();
  },

  // --- Kommunaler Org-Admin (Nachbar Pro Community, Desktop-Viewport) ---
  orgAdminPage: async ({ browser }, use) => {
    const stateFile = authFile("stadt_k");
    const ctx = await browser.newContext({
      storageState: stateFile,
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      extraHTTPHeaders: TEST_MODE_HEADERS,
    });
    await addE2eFlags(ctx, stateFile);
    const page = await ctx.newPage();
    await use(new OrgAdminPage(page));
    await ctx.close();
  },
});

export { expect } from "@playwright/test";
