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
  "/map-activity-pins-preview",
  "/jugend-ui-preview",
]);

const CLOSED_PILOT_PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/register/check-invite",
  "/api/register/complete",
  "/api/news/scrape",
  "/api/news/rss",
]);

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
  return CLOSED_PILOT_PUBLIC_PATHS.has(pathname);
}

export function isClosedPilotPublicApiPath(pathname: string) {
  if (CLOSED_PILOT_PUBLIC_API_PATHS.has(pathname)) return true;
  return isClosedPilotPublicCronPath(pathname);
}

export function buildClosedPilotApiBody() {
  return {
    error:
      "Der Nachbar.io-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.",
    status: "closed_pilot",
  };
}
