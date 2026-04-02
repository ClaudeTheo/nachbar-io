// Nachbar.io — Rollenbasierte Playwright-Fixtures mit test.extend
// Jede Fixture erzeugt einen isolierten BrowserContext mit vorgeladenem Auth-State.
// localStorage-Keys werden direkt nach Kontext-Erstellung gesetzt, um Onboarding-Screens
// und Alarm-Sounds in der E2E-Umgebung zu unterdruecken.
import { test as base } from "@playwright/test";
import {
  ResidentPage,
  CaregiverPage,
  ArztPage,
  PflegePage,
  OrgAdminPage,
} from "./types";
import { authFile } from "../helpers/auth-paths";

/** Typ-Map aller Rollen-Fixtures */
type RoleFixtures = {
  residentPage: ResidentPage;
  caregiverPage: CaregiverPage;
  arztPage: ArztPage;
  pflegePage: PflegePage;
  orgAdminPage: OrgAdminPage;
};

/** Helper: addInitScript fuer localStorage-Flags (laeuft bei jeder Navigation, nicht auf about:blank) */
async function addE2eFlags(
  ctx: import("@playwright/test").BrowserContext,
  includeCare = false,
) {
  await ctx.addInitScript(
    ({ includeCare: ic }) => {
      try {
        localStorage.setItem("e2e_disable_alarm", "true");
        localStorage.setItem("e2e_skip_onboarding", "true");
        if (ic) localStorage.setItem("care_disclaimer_accepted", "true");
      } catch {
        /* about:blank — ignorieren */
      }
    },
    { includeCare },
  );
}

export const test = base.extend<RoleFixtures>({
  // --- Bewohner (Nachbar Free, Senior-Modus, Pixel-5-Viewport) ---
  residentPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: authFile("senior_s"),
      viewport: { width: 393, height: 851 }, // Pixel 5
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
    });
    await addE2eFlags(ctx, true);
    const page = await ctx.newPage();
    await use(new ResidentPage(page));
    await ctx.close();
  },

  // --- Angehoeriger/Betreuer (Nachbar Plus, Desktop-Viewport) ---
  caregiverPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: authFile("betreuer_t"),
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
    });
    await addE2eFlags(ctx, true);
    const page = await ctx.newPage();
    await use(new CaregiverPage(page));
    await ctx.close();
  },

  // --- Arzt (Nachbar Pro Medical, Desktop-Viewport) ---
  arztPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: authFile("arzt_d"),
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
    });
    await addE2eFlags(ctx);
    const page = await ctx.newPage();
    await use(new ArztPage(page));
    await ctx.close();
  },

  // --- Pflegedienst (nachbar-pflege, Org-Admin Pflege-Typ, Desktop-Viewport) ---
  pflegePage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: authFile("pflege_p"),
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
    });
    await addE2eFlags(ctx);
    const page = await ctx.newPage();
    await use(new PflegePage(page));
    await ctx.close();
  },

  // --- Kommunaler Org-Admin (Nachbar Pro Community, Desktop-Viewport) ---
  orgAdminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: authFile("stadt_k"),
      viewport: { width: 1280, height: 720 },
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
    });
    await addE2eFlags(ctx);
    const page = await ctx.newPage();
    await use(new OrgAdminPage(page));
    await ctx.close();
  },
});

export { expect } from "@playwright/test";
