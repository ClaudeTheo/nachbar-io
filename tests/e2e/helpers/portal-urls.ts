// Nachbar.io — Portal-URLs fuer Cross-Portal E2E Tests
// Env-Variablen erlauben Tests gegen Live-Vercel-URLs oder lokale Dev-Server.

export const PORTAL_URLS = {
  io: process.env.E2E_BASE_URL || "http://localhost:3000",
  arzt: process.env.E2E_ARZT_URL || "http://localhost:3002",
  civic: process.env.E2E_CIVIC_URL || "http://localhost:3003",
  pflege: process.env.E2E_PFLEGE_URL || "http://localhost:3004",
} as const;

export type PortalName = keyof typeof PORTAL_URLS;

/** Baut eine vollstaendige URL fuer einen Portal-Pfad */
export function portalUrl(portal: PortalName, path: string): string {
  const base = PORTAL_URLS[portal].replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
