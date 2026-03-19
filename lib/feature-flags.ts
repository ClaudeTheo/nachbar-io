// lib/feature-flags.ts
// Nachbar.io — DB-getriebenes Feature-Flag System
// Ersetzt statische Feature-Gates durch dynamische, aus der DB geladene Flags.
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// --- Typen ---

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  required_roles: string[];
  required_plans: string[];
  enabled_quarters: string[];
  admin_override: boolean;
};

export type UserContext = {
  role: string;
  plan: string;
  quarter_id?: string;
};

// --- Cache ---

let flagCache: FeatureFlag[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 Sekunden

/**
 * Cache leeren (z.B. nach Admin-Aenderung eines Flags)
 */
export function invalidateFlagCache(): void {
  flagCache = null;
  cacheTimestamp = 0;
}

// --- Kernfunktionen ---

/**
 * Laedt alle Feature-Flags aus der Supabase-Tabelle `feature_flags`.
 * Nutzt einen 60-Sekunden In-Memory-Cache.
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const now = Date.now();

  // Cache gueltig?
  if (flagCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return flagCache;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled, required_roles, required_plans, enabled_quarters, admin_override');

  if (error || !data) {
    // Bei Fehler: leeres Array zurueckgeben (kein Feature aktiv)
    return [];
  }

  // Sicherstellen, dass Array-Felder immer Arrays sind
  const flags: FeatureFlag[] = data.map((row) => ({
    key: row.key,
    enabled: Boolean(row.enabled),
    required_roles: Array.isArray(row.required_roles) ? row.required_roles : [],
    required_plans: Array.isArray(row.required_plans) ? row.required_plans : [],
    enabled_quarters: Array.isArray(row.enabled_quarters) ? row.enabled_quarters : [],
    admin_override: Boolean(row.admin_override),
  }));

  flagCache = flags;
  cacheTimestamp = now;

  return flags;
}

/**
 * Prueft ob ein User Zugriff auf ein Feature hat.
 *
 * Logik:
 * 1. Flag nicht gefunden → false
 * 2. Flag deaktiviert → false
 * 3. PILOT_MODE aktiv → true (bypass Rollen-/Plan-Pruefung)
 * 4. admin_override + User ist Admin → true
 * 5. required_roles nicht leer + User-Rolle nicht enthalten → false
 * 6. required_plans nicht leer + User-Plan nicht enthalten → false
 * 7. enabled_quarters nicht leer + User-Quartier nicht enthalten → false
 * 8. Sonst → true
 */
export async function checkFeatureAccess(flagKey: string, user: UserContext): Promise<boolean> {
  const flags = await getFeatureFlags();
  const flag = flags.find((f) => f.key === flagKey);

  // 1. Flag nicht gefunden
  if (!flag) return false;

  // 2. Flag deaktiviert
  if (!flag.enabled) return false;

  // 3. PILOT_MODE Bypass
  const pilotMode = process.env.NEXT_PUBLIC_PILOT_MODE === 'true';
  if (pilotMode) return true;

  // 4. Admin-Override
  if (flag.admin_override && user.role === 'admin') return true;

  // 5. Rollen-Pruefung
  if (flag.required_roles.length > 0 && !flag.required_roles.includes(user.role)) {
    return false;
  }

  // 6. Plan-Pruefung
  if (flag.required_plans.length > 0 && !flag.required_plans.includes(user.plan)) {
    return false;
  }

  // 7. Quartier-Pruefung
  if (flag.enabled_quarters.length > 0) {
    if (!user.quarter_id || !flag.enabled_quarters.includes(user.quarter_id)) {
      return false;
    }
  }

  // 8. Alle Pruefungen bestanden
  return true;
}

// --- React Hook ---

/**
 * React Hook: Gibt zurueck ob ein Feature fuer den aktuellen User aktiv ist.
 * Laedt asynchron und startet mit false.
 */
export function useFeatureFlag(flagKey: string, user: UserContext): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    checkFeatureAccess(flagKey, user).then((result) => {
      if (!cancelled) setEnabled(result);
    });

    return () => { cancelled = true; };
  }, [flagKey, user.role, user.plan, user.quarter_id]);

  return enabled;
}
