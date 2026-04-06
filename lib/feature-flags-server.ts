// lib/feature-flags-server.ts
// Server-Side Feature-Flag-Pruefung fuer API-Routes
// Die Client-Version (feature-flags.ts) ist "use client" und hier nicht nutzbar.

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prueft ob ein Feature-Flag serverseitig aktiviert ist.
 * PILOT_MODE Bypass: Wenn PILOT_MODE aktiv, sind alle Features verfuegbar.
 *
 * @param supabase - Server Supabase Client (aus createClient())
 * @param flagKey - Feature-Flag-Schluessel (z.B. "YOUTH_MODULE")
 * @returns true wenn Feature aktiviert
 */
export async function isFeatureEnabledServer(
  supabase: SupabaseClient,
  flagKey: string,
): Promise<boolean> {
  // PILOT_MODE Bypass (gleiche Logik wie Client-Version)
  if (process.env.NEXT_PUBLIC_PILOT_MODE === "true") return true;

  try {
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", flagKey)
      .single();

    return data?.enabled === true;
  } catch {
    // Fail-open: Bei DB-Fehler Feature deaktiviert (sicherer Default)
    return false;
  }
}
