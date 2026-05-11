// Gemeinsame Legacy-Route-Gates fuer Middleware und UI.
//
// Historisch: Diese Liste verriegelte in "Phase I" 25 Routen serverseitig auf
// /kreis-start (siehe proxy.ts und tests/e2e/pilot-smoke.spec.ts Kriterium 11).
//
// 2026-05-11 Founder-Entscheidung: Phase-I-Gate aufgeloest. Alle Features sollen
// in der App erreichbar sein. Wenn einzelne Pages tatsaechlich nicht reif sind,
// werden sie ueber eigene Page-Level-FeatureGates geschuetzt (vgl. /handwerker)
// oder ueber gezielte Feature-Flags in den jeweiligen Routes.
//
// Gesundheits-Routes laufen separat ueber health-feature-gate (proxy.ts), das
// bleibt unveraendert.

export const LEGACY_ROUTE_PREFIXES = [] as const;

export function isLegacyRoute(pathname: string): boolean {
  // Liste leer seit 2026-05-11. Funktion bleibt erhalten als Hook, falls
  // einzelne Routes wieder gezielt verriegelt werden muessen.
  return LEGACY_ROUTE_PREFIXES.some(
    (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
