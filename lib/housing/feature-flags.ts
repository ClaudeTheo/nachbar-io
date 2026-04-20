// Nachbar.io — Housing-Feature-Flag-Helper (A7, Mig 177)
// Dünner Wrapper um lib/feature-flags.ts mit Master x Teilfunktion-Logik.
//
// Mig 177 definiert 6 Flags:
//  - HOUSING_MODULE_ENABLED (Master)
//  - HOUSING_REPORTS, HOUSING_ANNOUNCEMENTS, HOUSING_DOCUMENTS,
//    HOUSING_APPOINTMENTS (Teilfunktionen, nur wirksam wenn Master true)
//  - HOUSING_SHADOW_QUARTER (unabhaengig vom Master — gehoert logisch zum
//    Free-first-Pfad, nicht zur HV-Teilfunktion)
//
// Zweck: Admin-Dashboard kann Teilfunktionen granular schalten, ohne dass
// UI-Konsumenten beide Flags pruefen muessen.

"use client";

import { useEffect, useState } from "react";
import { checkFeatureAccess, type UserContext } from "@/lib/feature-flags";

export type HousingMasterKey = "HOUSING_MODULE_ENABLED";
export type HousingSubKey =
  | "HOUSING_REPORTS"
  | "HOUSING_ANNOUNCEMENTS"
  | "HOUSING_DOCUMENTS"
  | "HOUSING_APPOINTMENTS";
export type HousingIndependentKey = "HOUSING_SHADOW_QUARTER";
export type HousingFeatureKey =
  | HousingMasterKey
  | HousingSubKey
  | HousingIndependentKey;

const SUB_KEYS: HousingSubKey[] = [
  "HOUSING_REPORTS",
  "HOUSING_ANNOUNCEMENTS",
  "HOUSING_DOCUMENTS",
  "HOUSING_APPOINTMENTS",
];

function isSubKey(key: string): key is HousingSubKey {
  return (SUB_KEYS as string[]).includes(key);
}

/**
 * Prueft ob eine Housing-Funktion fuer den User aktiv ist.
 * Teilfunktionen brauchen zusaetzlich den Master-Schalter.
 *
 * @param key Housing-Flag-Key (Master, Teilfunktion, oder unabhaengig)
 * @param user User-Context (role, plan, quarter_id)
 */
export async function isHousingFeatureEnabled(
  key: HousingFeatureKey,
  user: UserContext,
): Promise<boolean> {
  // Teilfunktion: Master UND Flag pruefen
  if (isSubKey(key)) {
    const [master, sub] = await Promise.all([
      checkFeatureAccess("HOUSING_MODULE_ENABLED", user),
      checkFeatureAccess(key, user),
    ]);
    return master && sub;
  }
  // Master oder unabhaengiges Flag: direkt pruefen
  return checkFeatureAccess(key, user);
}

/**
 * React-Hook: Gibt zurueck, ob eine Housing-Funktion fuer den aktuellen
 * User aktiv ist. Start-Wert false, laedt asynchron.
 *
 * Beispiel:
 *   const canReport = useHousingFeature("HOUSING_REPORTS", { role, plan, quarter_id });
 *   if (!canReport) return null;
 */
export function useHousingFeature(
  key: HousingFeatureKey,
  user: UserContext,
): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isHousingFeatureEnabled(key, user).then((result) => {
      if (!cancelled) setEnabled(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user.role, user.plan, user.quarter_id]);

  return enabled;
}
