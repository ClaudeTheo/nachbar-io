// Gemeinsame Legacy-Route-Gates fuer Middleware und UI.
// Diese Ziele sind in Phase I bewusst noch nicht aktiv und werden serverseitig
// auf /kreis-start umgeleitet.

export const LEGACY_ROUTE_PREFIXES = [
  // Gesundheits-Routes (aerzte, appointments, consultations, sprechstunde,
  // medications, arzt) sind NICHT mehr hier: sie werden in proxy.ts via
  // health-feature-gate Flag-abhaengig geroutet. Siehe
  // docs/plans/2026-04-19-gesundheits-flags-stufe-3.md.
  "/care/shopping",
  "/care/tasks",
  "/care/reports",
  "/care/audit",
  "/care/kiosk",
  "/anamnese",
  "/board",
  "/marketplace",
  "/leihboerse",
  "/experts",
  "/handwerker",
  "/ki-fragebogen",
  "/pflegegrad-navigator",
  "/pflege-einstellungen",
  "/praevention",
  "/whohas",
  "/mitessen",
  "/lost-found",
  "/gruppen",
  "/polls",
  "/noise",
  "/reports",
  "/packages",
  "/vouching",
  "/companion",
  "/jugend",
] as const;

export function isLegacyRoute(pathname: string): boolean {
  return LEGACY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
