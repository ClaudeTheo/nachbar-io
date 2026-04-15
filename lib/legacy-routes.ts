// Gemeinsame Legacy-Route-Gates fuer Middleware und UI.
// Diese Ziele sind in Phase I bewusst noch nicht aktiv und werden serverseitig
// auf /kreis-start umgeleitet.

export const LEGACY_ROUTE_PREFIXES = [
  "/care/aerzte",
  "/care/appointments",
  "/care/consultations",
  "/care/sprechstunde",
  "/care/medications",
  "/care/shopping",
  "/care/tasks",
  "/care/reports",
  "/care/audit",
  "/care/kiosk",
  "/arzt",
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
  "/dashboard",
] as const;

export function isLegacyRoute(pathname: string): boolean {
  return LEGACY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
