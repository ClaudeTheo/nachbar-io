// Gemeinsame Legacy-Route-Gates fuer Middleware und UI.
//
// Historisch: Diese Liste verriegelte in "Phase I" 25 Routen serverseitig auf
// /kreis-start (siehe proxy.ts und tests/e2e/pilot-smoke.spec.ts Kriterium 11).
//
// 2026-05-11 Founder-Entscheidung: Phase-I-Gate aufgeloest ("alles offen").
// 2026-06-22 (Welle 3 / Befund C1:6, Founder-Go): bewusst teilweise umgekehrt.
// Fuer den geschlossenen Pilot ("Familienkreis + Quartier-Infos") werden
// flag-lose, nicht-pilotreife Module wieder verriegelt und SANFT auf /dashboard
// umgeleitet (kein 404). Das ist KEIN Code-Loeschen — nur Verriegeln; bei Bedarf
// pro Quartier wieder oeffnen (Liste leeren oder Eintrag entfernen).
//
// NICHT hier (eigene Mechanismen):
// - board / marketplace / events haben ein DB-Feature-Flag und laufen ueber
//   Layout-Flag-Gates (BOARD/MARKETPLACE/EVENTS_ENABLED) — pro Quartier schaltbar.
// - Gesundheits-Routes laufen ueber health-feature-gate (proxy.ts), unveraendert.

export const LEGACY_ROUTE_PREFIXES = [
  "/lost-found",
  "/polls",
  "/leihboerse",
  "/whohas",
  "/mitessen",
  "/noise",
  "/tips",
  "/experts",
  "/packages",
] as const;

export function isLegacyRoute(pathname: string): boolean {
  return LEGACY_ROUTE_PREFIXES.some(
    (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
