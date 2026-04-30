// lib/feature-flags-server.ts
// Server-Side Feature-Flag-Pruefung fuer API-Routes
// Die Client-Version (feature-flags.ts) ist "use client" und hier nicht nutzbar.

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prueft ob ein Feature-Flag serverseitig aktiviert ist.
 * PILOT_MODE wird bewusst nicht mehr fuer Feature-Flag-Logik genutzt.
 *
 * @param supabase - Server Supabase Client (aus createClient())
 * @param flagKey - Feature-Flag-Schluessel (z.B. "YOUTH_MODULE")
 * @returns true wenn Feature aktiviert
 */
export async function isFeatureEnabledServer(
  supabase: SupabaseClient,
  flagKey: string,
): Promise<boolean> {
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
