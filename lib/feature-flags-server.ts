// lib/feature-flags-server.ts
// Server-Side Feature-Flag-Pruefung fuer API-Routes
// Die Client-Version (feature-flags.ts) ist "use client" und hier nicht nutzbar.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserQuarterId } from "@/lib/quarters/helpers";

export type FeatureFlagGateConfig = {
  enabled: boolean;
  enabled_quarters: string[];
  admin_override: boolean;
};

export function normalizeFeatureFlagConfig(
  value: unknown,
): FeatureFlagGateConfig | null {
  if (!value || typeof value !== "object") return null;

  const config = value as Record<string, unknown>;
  if (typeof config.enabled !== "boolean") return null;

  const enabledQuarters = config.enabled_quarters;
  if (
    enabledQuarters !== null &&
    (!Array.isArray(enabledQuarters) ||
      enabledQuarters.some((quarterId) => typeof quarterId !== "string"))
  ) {
    return null;
  }

  return {
    enabled: config.enabled,
    enabled_quarters: enabledQuarters ?? [],
    admin_override: config.admin_override === true,
  };
}

/**
 * Wertet eine geladene Flag-Konfiguration fuer den authentifizierten Nutzer aus.
 * Quartier und Admin-Status werden ausschliesslich serverseitig bestimmt.
 */
export async function resolveFeatureFlagAccess(
  supabase: SupabaseClient,
  flag: FeatureFlagGateConfig,
): Promise<boolean> {
  if (!flag.enabled) return false;
  if (flag.enabled_quarters.length === 0) return true;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return false;

    if (flag.admin_override) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && profile?.is_admin === true) return true;
    }

    const quarterId = await getUserQuarterId(supabase, user.id);
    return quarterId !== null && flag.enabled_quarters.includes(quarterId);
  } catch {
    return false;
  }
}

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
      .select("enabled, enabled_quarters, admin_override")
      .eq("key", flagKey)
      .single();

    const flag = normalizeFeatureFlagConfig(data);
    if (!flag) return false;

    return resolveFeatureFlagAccess(supabase, flag);
  } catch {
    // Fail-closed: Bei DB-Fehler Feature deaktiviert (sicherer Default)
    return false;
  }
}
