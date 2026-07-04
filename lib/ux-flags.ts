// lib/ux-flags.ts
// Nachbar.io - UX-Redesign Feature-Flags
// Bestehende Redesign-Flags sind default-on und per "false" deaktivierbar.
// UX_GENERATION_DESIGN_V2 ist ein Preview-Flag: default-off, Opt-in via
// NEXT_PUBLIC_UX_GENERATION_DESIGN_V2="true".

export type UxFlag =
  | "UX_REDESIGN_NAV"
  | "UX_REDESIGN_ILLUSTRATIONS"
  | "UX_GENERATION_DESIGN_V2";

/**
 * Prueft ob ein UX-Redesign-Flag aktiv ist.
 * Die jeweiligen Defaults stehen in den switch-Zweigen.
 *
 * UX_REDESIGN_DASHBOARD wurde 2026-05-12 mit Visual-Polish v7 Phase C entfernt
 * (dazugehoerige Komponenten DashboardHero/HeroCard/EmptyState/DashboardServices geloescht).
 */
export function isUxRedesignEnabled(flag: UxFlag): boolean {
  switch (flag) {
    case "UX_REDESIGN_NAV":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_NAV !== "false";
    case "UX_REDESIGN_ILLUSTRATIONS":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_ILLUSTRATIONS !== "false";
    case "UX_GENERATION_DESIGN_V2":
      return process.env.NEXT_PUBLIC_UX_GENERATION_DESIGN_V2 === "true";
    default:
      return true;
  }
}
