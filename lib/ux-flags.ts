// lib/ux-flags.ts
// Nachbar.io — UX-Redesign Feature-Flags
// Redesign Wave 1+2+3 abgeschlossen → alle Flags standardmaessig aktiv.
// Env-Variable kann auf "false" gesetzt werden zum Deaktivieren (Rollback).

export type UxFlag =
  | "UX_REDESIGN_NAV"
  | "UX_REDESIGN_DASHBOARD"
  | "UX_REDESIGN_ILLUSTRATIONS";

/**
 * Prueft ob ein UX-Redesign-Flag aktiv ist.
 * Standard: true (Redesign abgeschlossen).
 * Kann via NEXT_PUBLIC_ env auf "false" gesetzt werden fuer Rollback.
 */
export function isUxRedesignEnabled(flag: UxFlag): boolean {
  switch (flag) {
    case "UX_REDESIGN_NAV":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_NAV !== "false";
    case "UX_REDESIGN_DASHBOARD":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_DASHBOARD !== "false";
    case "UX_REDESIGN_ILLUSTRATIONS":
      return process.env.NEXT_PUBLIC_UX_REDESIGN_ILLUSTRATIONS !== "false";
    default:
      return true;
  }
}
