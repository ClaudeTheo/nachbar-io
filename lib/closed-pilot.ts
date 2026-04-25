export const CLOSED_PILOT_ROBOTS_HEADER = "noindex, nofollow, noarchive";

const CLOSED_PILOT_PUBLIC_PATHS = new Set([
  "/",
  "/agb",
  "/barrierefreiheit",
  "/datenquellen",
  "/datenschutz",
  "/impressum",
]);

export function isClosedPilotMode() {
  return process.env.NEXT_PUBLIC_CLOSED_PILOT_MODE !== "false";
}

export function isClosedPilotPublicPath(pathname: string) {
  return CLOSED_PILOT_PUBLIC_PATHS.has(pathname);
}

export function buildClosedPilotApiBody() {
  return {
    error:
      "Der Nachbar.io-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.",
    status: "closed_pilot",
  };
}
