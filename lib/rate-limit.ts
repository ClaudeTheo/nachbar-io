// lib/rate-limit.ts
// In-Memory Rate Limiter fuer Next.js Middleware (Edge-kompatibel)
// Sliding Window Counter — kein externer Service noetig

// --- Typen ---

interface RateLimitCategory {
  name: string;
  prefixes: string[];
  limit?: number;
  windowMs?: number;
  skip?: boolean; // true = Rate Limiting komplett ueberspringen
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number; // Millisekunden bis Window zurueckgesetzt wird
}

// --- Konfiguration: Route-Kategorien ---
// Reihenfolge ist wichtig — erster Match gewinnt

const RATE_LIMIT_CONFIG: RateLimitCategory[] = [
  // Cron-Jobs: NIEMALS begrenzen (Vercel Scheduler darf nicht blockiert werden)
  {
    name: "cron",
    prefixes: [
      "/api/cron/",
      "/api/care/cron/",
      "/api/news/scrape",
      "/api/news/rss",
    ],
    skip: true,
  },
  // Auth: Streng begrenzen (Brute-Force-Schutz)
  // check-invite ist readonly (nur DB-Lookup) → separates, grosszuegigeres Limit
  {
    name: "auth-check",
    prefixes: ["/api/register/check-invite"],
    limit: 30,
    windowMs: 60_000,
  },
  {
    name: "auth",
    prefixes: ["/api/register/"],
    limit: 5,
    windowMs: 60_000,
  },
  // Teure Operationen: Sehr streng (Claude API, Push-Broadcast, etc.)
  {
    name: "expensive",
    prefixes: [
      "/api/news/aggregate",
      "/api/push/send",
      "/api/push/notify",
      "/api/admin/broadcast",
      "/api/reputation/recompute",
      "/api/user/delete",
      "/api/user/export",
    ],
    limit: 3,
    windowMs: 60_000,
  },
  // Device-Endpunkte: Moderat (IoT-Geraet pollt alle ~5 Min)
  {
    name: "device",
    prefixes: ["/api/device/"],
    limit: 30,
    windowMs: 60_000,
  },
  // Passive Heartbeats werden serverseitig bereits pro User dedupliziert.
  // Edge-IP-Limits erzeugen hier vor allem Audit-Rauschen ohne Sicherheitsgewinn.
  {
    name: "heartbeat",
    prefixes: ["/api/heartbeat"],
    skip: true,
  },
  // Admin-Endpunkte: Großzuegig aber begrenzt
  {
    name: "admin",
    prefixes: ["/api/admin/"],
    limit: 20,
    windowMs: 60_000,
  },
  // Standard: Alle anderen API-Endpunkte
  {
    name: "default",
    prefixes: ["/api/"],
    limit: 60,
    windowMs: 60_000,
  },
];

// Laengstes Window fuer Cleanup-Logik (5 Minuten)
const MAX_WINDOW_MS = 5 * 60 * 1000;
// Cleanup-Intervall (60 Sekunden)
const CLEANUP_INTERVAL_MS = 60_000;

// --- Rate Limiter Klasse ---

class RateLimiter {
  private store = new Map<string, number[]>();
  private lastCleanup = Date.now();

  /**
   * Prueft ob ein Request erlaubt ist.
   * Gibt Ergebnis mit verbleibenden Requests und Reset-Zeit zurueck.
   */
  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Timestamps fuer diesen Key holen (oder leeres Array)
    let timestamps = this.store.get(key) ?? [];

    // Alte Timestamps entfernen (ausserhalb des Fensters)
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Anzahl der Requests im aktuellen Fenster
    const count = timestamps.length;

    // Reset-Zeit berechnen: Wann wird der aelteste Request aus dem Fenster fallen?
    const resetMs =
      timestamps.length > 0 ? timestamps[0] + windowMs - now : windowMs;

    if (count >= limit) {
      // Limit erreicht — Request ablehnen
      this.store.set(key, timestamps);
      this.maybeCleanup(now);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    // Request erlauben — Timestamp hinzufuegen
    timestamps.push(now);
    this.store.set(key, timestamps);
    this.maybeCleanup(now);

    return {
      allowed: true,
      limit,
      remaining: limit - timestamps.length,
      resetMs: Math.max(0, resetMs),
    };
  }

  /**
   * Lazy Cleanup: Entfernt abgelaufene Eintraege aus der Map.
   * Wird nur alle CLEANUP_INTERVAL_MS Millisekunden ausgefuehrt.
   */
  private maybeCleanup(now: number): void {
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;

    this.lastCleanup = now;
    const expiry = now - MAX_WINDOW_MS;

    for (const [key, timestamps] of this.store.entries()) {
      // Wenn der neueste Timestamp abgelaufen ist, Eintrag loeschen
      if (
        timestamps.length === 0 ||
        timestamps[timestamps.length - 1] <= expiry
      ) {
        this.store.delete(key);
      }
    }
  }
}

// --- Singleton-Instanz (lebt im Module-Scope, ueberlebt Requests) ---

const rateLimiter = new RateLimiter();

// --- Oeffentliche API ---

/**
 * Bestimmt die Rate-Limit-Kategorie fuer einen API-Pfad.
 * Gibt null zurueck wenn Rate Limiting uebersprungen werden soll.
 */
export function getRouteCategory(
  pathname: string,
): { name: string; limit: number; windowMs: number } | null {
  for (const category of RATE_LIMIT_CONFIG) {
    const matches = category.prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix),
    );

    if (matches) {
      if (category.skip) return null; // Cron-Jobs ueberspringen
      return {
        name: category.name,
        limit: category.limit!,
        windowMs: category.windowMs!,
      };
    }
  }

  return null; // Kein Match = kein Rate Limiting
}

/**
 * Extrahiert den Client-Identifikator fuer Rate Limiting.
 * Fuer Device-Endpoints: Token aus Query-Parameter.
 * Fuer alle anderen: IP-Adresse.
 */
export function getClientKey(request: {
  headers: { get(name: string): string | null };
  nextUrl?: {
    pathname: string;
    searchParams: { get(name: string): string | null };
  };
  ip?: string | null;
}): string {
  // Device-Endpoints: Token aus URL-Parameter verwenden
  if (request.nextUrl?.pathname.startsWith("/api/device/")) {
    const token = request.nextUrl.searchParams.get("token");
    if (token && token.length >= 16) {
      // Nur erste 16 Zeichen als Key (Privacy + Speicher)
      return `device:${token.substring(0, 16)}`;
    }
  }

  // IP-basierter Key fuer alle anderen
  const ip = extractIp(request);
  return `ip:${ip}`;
}

/**
 * Extrahiert die Client-IP-Adresse aus dem Request.
 * Prueft Vercel/Proxy-Header in der richtigen Reihenfolge.
 */
function extractIp(request: {
  headers: { get(name: string): string | null };
  ip?: string | null;
}): string {
  // 1. x-forwarded-for (Standard-Proxy-Header, erstes IP = Original-Client)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // 2. x-real-ip (Vercel-spezifisch)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // 3. Next.js built-in
  if (request.ip) return request.ip;

  // 4. Fallback
  return "unknown";
}

/**
 * Fuehrt die Rate-Limit-Pruefung durch.
 * Gibt das Ergebnis zurueck oder null wenn die Route uebersprungen wird.
 */
export function checkRateLimit(
  pathname: string,
  clientKey: string,
  rateDivisor: number = 1,
): RateLimitResult | null {
  const category = getRouteCategory(pathname);
  if (!category) return null; // Route wird uebersprungen

  // Key MUSS Kategorie enthalten — sonst teilen sich alle Routen
  // einer IP denselben Bucket (z.B. "default" 60/min frisst "auth" 5/min auf)
  const scopedKey = `${category.name}:${clientKey}`;
  const adjustedLimit = Math.max(1, Math.floor(category.limit / rateDivisor));
  return rateLimiter.check(scopedKey, adjustedLimit, category.windowMs);
}
