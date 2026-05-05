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
]);

const CLOSED_PILOT_PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/register/check-invite",
  "/api/register/complete",
  "/api/cron/ai-test-cleanup-dry-run",
]);

export function isClosedPilotMode() {
  return process.env.NEXT_PUBLIC_CLOSED_PILOT_MODE !== "false";
}

export function isClosedPilotPublicPath(pathname: string) {
  return CLOSED_PILOT_PUBLIC_PATHS.has(pathname);
}

export function isClosedPilotPublicApiPath(pathname: string) {
  return CLOSED_PILOT_PUBLIC_API_PATHS.has(pathname);
}

export function buildClosedPilotApiBody() {
  return {
    error:
      "Der Nachbar.io-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.",
    status: "closed_pilot",
  };
}
