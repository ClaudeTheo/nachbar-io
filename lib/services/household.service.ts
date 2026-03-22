// Nachbar.io — Household-Service
// Zentralisiert alle Supabase-Operationen fuer "households" und "household_members".

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Household, HouseholdMember } from "@/lib/supabase/types";

// ============================================================
// Client-seitige Funktionen
// ============================================================

/** Haushalt anhand der ID laden. */
export async function getHousehold(householdId: string): Promise<Household> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();
  if (error) throw error;
  return data as Household;
}

/** Haushalt eines Nutzers laden (ueber household_members Join). */
export async function getHouseholdForUser(userId: string): Promise<Household | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("household:households(*)")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return (data?.household as unknown as Household) ?? null;
}

/** Membership eines Nutzers laden (household_id + role). */
export async function getMembership(userId: string): Promise<HouseholdMember | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return (data as HouseholdMember) ?? null;
}

/** Alle Mitglieder eines Haushalts laden. */
export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HouseholdMember[];
}

/** Alle Haushalte eines Quartiers laden (fuer Karte / Admin). */
export async function getHouseholdsByQuarter(quarterId: string): Promise<Household[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("quarter_id", quarterId)
    .order("street_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Household[];
}

// ============================================================
// Server-seitige Funktionen
// ============================================================

/** Haushalt laden (Server-Variante). */
export async function getHouseholdServer(
  supabase: SupabaseClient,
  householdId: string
): Promise<Household> {
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();
  if (error) throw error;
  return data as Household;
}

/** Haushalt eines Nutzers laden (Server-Variante). */
export async function getHouseholdForUserServer(
  supabase: SupabaseClient,
  userId: string
): Promise<Household | null> {
  const { data, error } = await supabase
    .from("household_members")
    .select("household:households(*)")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return (data?.household as unknown as Household) ?? null;
}

/** Alle Mitglieder eines Haushalts laden (Server-Variante). */
export async function getHouseholdMembersServer(
  supabase: SupabaseClient,
  householdId: string
): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HouseholdMember[];
}
