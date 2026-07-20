import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { ServiceError } from "@/lib/services/service-error";

/**
 * Loest einen fremden Bewohner-Haushalt ausschliesslich nach einem aktiven
 * Caregiver-Link auf. Der RLS-Bypass bleibt damit an den Ownership-Check gebunden.
 */
export async function getAuthorizedResidentHouseholdId(
  userSupabase: SupabaseClient,
  caregiverId: string,
  residentId: string,
): Promise<string> {
  const { data: link } = await userSupabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", caregiverId)
    .eq("resident_id", residentId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!link) {
    throw new ServiceError(
      "Kein aktiver Caregiver-Link zu diesem Bewohner",
      403,
    );
  }

  const adminSupabase = getAdminSupabase();
  const { data: member, error } = await adminSupabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", residentId)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !member) {
    throw new ServiceError("Bewohner ist keinem Haushalt zugeordnet", 404);
  }

  return member.household_id;
}
