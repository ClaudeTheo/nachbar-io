// Nachbar.io — Gecachter Auth-Wrapper gegen Supabase Rate Limits
// Problem: getUser() wird pro Seitenaufruf 3-4x aufgerufen (Middleware + Layout + Page + Hooks),
// HMR multipliziert das → 429 nach wenigen Minuten.
// Loesung: Client-seitiger Cache mit 5s TTL + Server-seitiger React.cache()

import type { User } from "@supabase/supabase-js";

// === CLIENT-SEITIGER CACHE ===
// Cached das Ergebnis von getUser() fuer 5 Sekunden.
// Bei HMR-Reloads wird so nur 1x pro 5s die API angefragt statt bei jedem Mount.

let cachedUser: User | null = null;
let cachedAt = 0;
let pendingPromise: Promise<{ user: User | null; error: Error | null }> | null = null;

const CACHE_TTL_MS = 5_000; // 5 Sekunden

/**
 * Gecachte Version von supabase.auth.getUser() fuer Client-Komponenten.
 * Dedupliziert gleichzeitige Aufrufe und cached das Ergebnis fuer 5s.
 * Verwende diese Funktion statt supabase.auth.getUser() in allen "use client" Dateien.
 */
export async function getCachedUser(
  supabase: { auth: { getUser: () => Promise<{ data: { user: User | null }; error: unknown }> } }
): Promise<{ user: User | null; error: Error | null }> {
  const now = Date.now();

  // Cache gueltig? → sofort zurueckgeben
  if (cachedUser && now - cachedAt < CACHE_TTL_MS) {
    return { user: cachedUser, error: null };
  }

  // Laufender Request? → darauf warten (Dedup)
  if (pendingPromise) {
    return pendingPromise;
  }

  // Neuer Request
  pendingPromise = supabase.auth.getUser()
    .then(({ data, error }) => {
      cachedUser = data.user;
      cachedAt = Date.now();
      pendingPromise = null;
      return { user: data.user, error: error as Error | null };
    })
    .catch((err: Error) => {
      pendingPromise = null;
      return { user: null, error: err };
    });

  return pendingPromise;
}

/**
 * Cache invalidieren — z.B. nach Sign-Out oder Token-Refresh.
 */
export function invalidateUserCache(): void {
  cachedUser = null;
  cachedAt = 0;
  pendingPromise = null;
}
