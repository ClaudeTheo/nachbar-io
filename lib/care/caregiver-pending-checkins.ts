// Caregiver-only Pending-Checkin-Status fuer die Dashboard-Karte
// (Founder 2026-05-12, Variante X — DSGVO-konform).
//
// Liefert die household_ids von Senioren, die der angemeldete Nutzer
// als Caregiver/Angehoeriger verbunden hat und deren heutiger Check-in
// noch nicht abgeschlossen wurde (status "pending" oder "reminded";
// "missed" ist bereits via alerts -> red Pin abgedeckt).
//
// RLS auf caregiver_links + care_checkins regelt zusaetzlich: andere
// Nutzer ohne Link bekommen leeres Result; Care-Privacy bleibt
// geschuetzt.

import type { SupabaseClient } from "@supabase/supabase-js";

interface CaregiverLinkRow {
  resident_id: string;
}

interface PendingCheckinRow {
  senior_id: string;
}

interface HouseholdMemberRow {
  household_id: string;
  user_id: string;
}

/**
 * Laedt die Haushalte (household_id) von Senioren, fuer die der
 * angegebene Caregiver verantwortlich ist UND deren heutiger Check-in
 * noch offen ist (nicht eskaliert — eskalierte sind bereits rot
 * via alerts-Tabelle).
 */
export async function loadCaregiverPendingCheckinHouseholds(
  supabase: SupabaseClient,
  caregiverUserId: string,
  today: string = new Date().toISOString().split("T")[0],
): Promise<Set<string>> {
  if (!caregiverUserId) return new Set();

  // 1. Aktive caregiver_links des angemeldeten Nutzers laden.
  const { data: links } = await supabase
    .from("caregiver_links")
    .select("resident_id")
    .eq("caregiver_id", caregiverUserId)
    .is("revoked_at", null);

  const residentIds = ((links ?? []) as CaregiverLinkRow[])
    .map((link) => link.resident_id)
    .filter(Boolean);

  if (residentIds.length === 0) return new Set();

  // 2. Heutige Check-ins dieser Senioren mit noch offenem Status laden.
  // "missed" ist bewusst NICHT inkludiert — eskalierte Misses laufen ueber
  // alerts.is_emergency und leuchten sowieso rot.
  const { data: checkins } = await supabase
    .from("care_checkins")
    .select("senior_id")
    .in("senior_id", residentIds)
    .gte("scheduled_at", today)
    .is("completed_at", null)
    .in("status", ["pending", "reminded"]);

  const pendingSeniorIds = new Set(
    ((checkins ?? []) as PendingCheckinRow[]).map((row) => row.senior_id),
  );
  if (pendingSeniorIds.size === 0) return new Set();

  // 3. household_id der pending Senioren ueber household_members holen.
  const { data: members } = await supabase
    .from("household_members")
    .select("household_id, user_id")
    .in("user_id", [...pendingSeniorIds])
    .not("verified_at", "is", null);

  const householdIds = new Set<string>();
  for (const member of (members ?? []) as HouseholdMemberRow[]) {
    if (member.household_id) householdIds.add(member.household_id);
  }
  return householdIds;
}
