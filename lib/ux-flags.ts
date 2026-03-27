// lib/ux-flags.ts
// Nachbar.io — UX-Redesign Feature-Flags (env-basiert)
// Einfache Flags fuer schrittweises Rollout des UX-Redesigns.
// Unabhaengig vom DB-getriebenen Feature-Flag-System.
//
// WICHTIG: Next.js ersetzt process.env.NEXT_PUBLIC_* nur bei
// literalen Zugriffen. Daher kein dynamischer Key-Lookup moeglich.

export type UxFlag =
  | "UX_REDESIGN_NAV"
  | "UX_REDESIGN_DASHBOARD"
  | "UX_REDESIGN_ILLUSTRATIONS";

/**
 * Prueft ob ein UX-Redesign-Flag aktiv ist.
 * Liest aus NEXT_PUBLIC_ env-Variablen, Fallback: false.
 */
export function isUxRedesignEnabled(flag: UxFlag): boolean {
  switch (flag) {
    case "UX_REDESIGN_NAV":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_NAV === "true";
    case "UX_REDESIGN_DASHBOARD":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_DASHBOARD === "true";
    case "UX_REDESIGN_ILLUSTRATIONS":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_ILLUSTRATIONS === "true";
    default:
      return false;
  }
}
