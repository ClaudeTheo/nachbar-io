// lib/security/config.ts
// Zentrale Konfiguration: Schwellwerte, Decay-Raten, Route-Klassifikation

export type TrapType =
  | "fake_admin"
  | "honeypot"
  | "enumeration"
  | "idor"
  | "brute_force"
  | "scanner_header"
  | "cron_probe";

export type Severity = "info" | "warning" | "high" | "critical";
export type RouteCategory = "critical" | "sensitive" | "standard" | "public";

// Decay-Halbwertszeiten in Millisekunden pro Event-Kategorie
export const DECAY_HALF_LIFE: Record<string, number> = {
  auth: 15 * 60 * 1000,       // 15 min
  bot: 30 * 60 * 1000,        // 30 min
  scanner: 60 * 60 * 1000,    // 60 min
  critical: 120 * 60 * 1000,  // 120 min
};

// Welcher Trap-Typ gehoert zu welcher Decay-Kategorie
export const TRAP_DECAY_CATEGORY: Record<TrapType, keyof typeof DECAY_HALF_LIFE> = {
  fake_admin: "scanner",
  honeypot: "bot",
  enumeration: "scanner",
  idor: "scanner",
  brute_force: "auth",
  scanner_header: "bot",
  cron_probe: "critical",
};

// Route-Klassifikation: Welche Routen sind wie sensibel
export const ROUTE_CLASSIFICATION: { category: RouteCategory; patterns: string[] }[] = [
  {
    category: "critical",
    patterns: ["/api/care/", "/api/heartbeat/", "/api/export/", "/api/admin/"],
  },
  {
    category: "sensitive",
    patterns: ["/api/auth/", "/api/register/", "/api/geo/by-street", "/api/appointments/", "/api/medications/"],
  },
  {
    category: "standard",
    patterns: ["/api/groups/", "/api/points/", "/api/prevention/", "/api/geo/"],
  },
  {
    category: "public",
    patterns: ["/api/news/", "/api/quarter/", "/api/quartier-info/"],
  },
];

// Schwellwerte pro Route-Kategorie
export const STAGE_THRESHOLDS: Record<RouteCategory, { stage2: number; stage3: number }> = {
  critical: { stage2: 30, stage3: 60 },
  sensitive: { stage2: 50, stage3: 80 },
  standard: { stage2: 70, stage3: 100 },
  public: { stage2: Infinity, stage3: Infinity }, // nie gedrosselt
};

// Stage-4-Schwellwerte (global, nicht route-spezifisch)
export const STAGE4_THRESHOLD = 100;
export const STAGE4_MIN_TRAP_TYPES = 2;
export const STAGE4_MIN_DIMENSIONS = 2;

// Honeypot-Pfade: Middleware erkennt diese VOR dem Next.js-Router
export const HONEYPOT_PATHS = [
  "/.env",
  "/wp-admin",
  "/wp-login.php",
  "/phpmyadmin",
  "/graphql",
  "/actuator",
  "/debug/vars",
  "/.git/config",
  "/server-status",
  "/api/admin/config",
  "/api/admin/users/export",
  "/api/internal/debug",
  "/api/internal/env",
];

// Bekannte Scanner User-Agents (Substrings, lowercase)
export const SCANNER_USER_AGENTS = [
  "sqlmap", "nikto", "nmap", "dirbuster", "gobuster",
  "wpscan", "nuclei", "ffuf", "feroxbuster", "burpsuite",
  "masscan", "zgrab", "httpx",
];

// Redis-Key-Prefix + TTL
export const REDIS_KEY_PREFIX = "sec";
export const REDIS_KEY_TTL_SECONDS = 4 * 60 * 60; // 4h

// Rate-Limit-Divisor fuer Stufe 2 (1/3 des normalen Limits)
export const STAGE2_RATE_DIVISOR = 3;

export function classifyRoute(pathname: string): RouteCategory {
  for (const { category, patterns } of ROUTE_CLASSIFICATION) {
    if (patterns.some((p) => pathname.startsWith(p) || pathname === p)) {
      return category;
    }
  }
  return "standard"; // Fallback
}

export function determineSeverity(trapType: TrapType, points: number): Severity {
  if (trapType === "cron_probe") return "high";
  if (points >= 40) return "high";
  if (points >= 20) return "warning";
  return "info";
}
