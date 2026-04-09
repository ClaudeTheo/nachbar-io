// Nachbar.io — MFA-Pruefung fuer privilegierte Rollen
// Admins (is_admin) und Aerzte (doctor, doctor_admin) MUESSEN MFA aktiviert haben
// Nutzt Supabase Auth MFA (TOTP)

import type { SupabaseClient } from "@supabase/supabase-js";

// Rollen die MFA benoetigen
const MFA_REQUIRED_ROLES = ["doctor", "doctor_admin"] as const;

export interface MfaStatus {
  required: boolean;
  enabled: boolean;
  verified: boolean; // Hat der Nutzer in dieser Session MFA verifiziert?
}

// Prueft ob der Nutzer MFA aktiviert hat und in der Session verifiziert ist
export async function checkMfaStatus(
  supabase: SupabaseClient,
): Promise<MfaStatus> {
  // Aktuelle Session + Assurance Level abfragen
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { required: false, enabled: false, verified: false };

  // MFA-Pflicht pruefen: is_admin oder Arzt-Rolle
  const isAdmin = user.user_metadata?.is_admin === true;
  const role = user.user_metadata?.role as string | undefined;
  const required =
    isAdmin ||
    MFA_REQUIRED_ROLES.includes(role as (typeof MFA_REQUIRED_ROLES)[number]);

  // MFA-Faktoren abfragen
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactors =
    factorsData?.totp?.filter((f) => f.status === "verified") ?? [];
  const enabled = totpFactors.length > 0;

  // Assurance Level pruefen (aal2 = MFA verifiziert in dieser Session)
  const {
    data: { currentLevel },
  } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verified = currentLevel === "aal2";

  return { required, enabled, verified };
}

// Middleware-Helper: Gibt 403 zurueck wenn MFA erforderlich aber nicht verifiziert
export function requireMfa(status: MfaStatus): string | null {
  if (!status.required) return null;
  if (!status.enabled) return "MFA_NOT_ENROLLED";
  if (!status.verified) return "MFA_NOT_VERIFIED";
  return null;
}
