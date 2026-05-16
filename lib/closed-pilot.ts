export const CLOSED_PILOT_ROBOTS_HEADER = "noindex, nofollow, noarchive";

const CLOSED_PILOT_PUBLIC_PATHS = new Set([
  "/",
  "/agb",
  "/auth/callback",
  "/barrierefreiheit",
  "/datenquellen",
  "/datenschutz",
  "/freigabe-ausstehend",
  "/impressum",
  "/login",
  "/opengraph-image",
  "/register",
  "/senior/preview",
  "/care/preview",
  "/care/consent/preview",
  "/menu-structure-preview",
  "/ui-modes-preview",
  "/ui-modi-entscheidungsmatrix",
  "/ui-modi-entscheidungsmatrix.html",
  "/map-activity-pins-preview",
  "/jugend-ui-preview",
  "/jugend-missionen-preview",
  "/jugend-tauschen-preview",
  "/jugend-gruppen-preview",
]);

const CLOSED_PILOT_PUBLIC_PREFIXES = ["/setup/"];

const CLOSED_PILOT_PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/register/check-invite",
  "/api/register/complete",
  "/api/news/scrape",
  "/api/news/rss",
]);

function isClosedPilotPublicFamilySetupApiPath(pathname: string) {
  const prefix = "/api/family-setup/";
  if (!pathname.startsWith(prefix)) return false;

  const token = pathname.slice(prefix.length);
  if (token === "child" || token === "senior") return false;

  return token.length > 0 && !token.includes("/");
}

// Vercel-Cron-Routen muessen im Closed-Pilot-Mode erreichbar bleiben (sonst stoppen
// alle Heartbeat/Sync/Reminder-Jobs). Sie sind durch verifyCronSecret() geschuetzt
// — Whitelist hier blockt nur den 503-closed_pilot-Filter, nicht die Cron-Auth.
// Aktiver Bestand: nachbar-io/vercel.json crons[].
function isClosedPilotPublicCronPath(pathname: string) {
  return (
    pathname.startsWith("/api/cron/") || pathname.startsWith("/api/care/cron/")
  );
}

export function isClosedPilotMode() {
  return process.env.NEXT_PUBLIC_CLOSED_PILOT_MODE !== "false";
}

export function isClosedPilotPublicPath(pathname: string) {
  return (
    CLOSED_PILOT_PUBLIC_PATHS.has(pathname) ||
    CLOSED_PILOT_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isClosedPilotPublicApiPath(pathname: string) {
  if (CLOSED_PILOT_PUBLIC_API_PATHS.has(pathname)) return true;
  if (isClosedPilotPublicFamilySetupApiPath(pathname)) return true;
  return isClosedPilotPublicCronPath(pathname);
}

export function buildClosedPilotApiBody() {
  return {
    error:
      "Der QuartierApp-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.",
    status: "closed_pilot",
  };
}
