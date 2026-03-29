// Nachbar.io — Household-Service
// Zentralisiert alle Supabase-Operationen fuer "households" und "household_members".

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Household, HouseholdMember } from "@/lib/supabase/types";
import { generateSecureCode } from "@/lib/invite-codes";
import { ServiceError } from "@/lib/services/service-error";

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
export async function getHouseholdForUser(
  userId: string,
): Promise<Household | null> {
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
export async function getMembership(
  userId: string,
): Promise<HouseholdMember | null> {
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
export async function getHouseholdMembers(
  householdId: string,
): Promise<HouseholdMember[]> {
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
export async function getHouseholdsByQuarter(
  quarterId: string,
): Promise<Household[]> {
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
  householdId: string,
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
  userId: string,
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
  householdId: string,
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

// ============================================================
// Find-or-Create (fuer Registrierung / Onboarding)
// ============================================================

export interface FindOrCreateInput {
  streetName: string;
  houseNumber: string;
  lat?: number;
  lng?: number;
}

export interface FindOrCreateResult {
  householdId: string;
  streetName: string;
  houseNumber: string;
  created: boolean;
}

/**
 * Haushalt anhand Straße + Hausnummer suchen oder neu anlegen.
 * Verwendet Service-Role fuer Schreibzugriff.
 * Bei Race-Condition (unique constraint) wird erneut gesucht.
 */
export async function findOrCreateHousehold(
  adminDb: SupabaseClient,
  input: FindOrCreateInput,
): Promise<FindOrCreateResult> {
  const { streetName, lat, lng } = input;
  const trimmedHouseNumber = String(input.houseNumber).trim();

  if (!streetName || !trimmedHouseNumber) {
    throw new ServiceError("Straße und Hausnummer sind erforderlich.", 400);
  }

  // 1. Bestehenden Haushalt suchen
  const { data: existing } = await adminDb
    .from("households")
    .select("id, street_name, house_number")
    .eq("street_name", streetName)
    .eq("house_number", trimmedHouseNumber)
    .maybeSingle();

  if (existing) {
    return {
      householdId: existing.id,
      streetName: existing.street_name,
      houseNumber: existing.house_number,
      created: false,
    };
  }

  // 2. Neuen Haushalt anlegen
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const inviteCode = generateSecureCode();

  // Quartier-ID ermitteln: via PostGIS Clustering oder Fallback
  let quarterId: string | null = null;
  if (hasCoords) {
    const { assignUserToQuarter } =
      await import("@/lib/geo/quarter-clustering");
    try {
      quarterId = await assignUserToQuarter(adminDb, lat!, lng!);
    } catch (err) {
      console.error("Quartier-Clustering fehlgeschlagen:", err);
    }
  }
  if (!quarterId) {
    const { data: fallback } = await adminDb
      .from("quarters")
      .select("id")
      .limit(1)
      .single();
    if (fallback) quarterId = fallback.id;
  }

  const { data: newHousehold, error: insertError } = await adminDb
    .from("households")
    .insert({
      street_name: streetName,
      house_number: trimmedHouseNumber,
      lat: hasCoords ? lat : 0,
      lng: hasCoords ? lng : 0,
      verified: false,
      invite_code: inviteCode,
      quarter_id: quarterId,
    })
    .select("id, street_name, house_number")
    .single();

  if (insertError) {
    // Race-Condition: Anderer Request hat den Haushalt gerade erstellt
    if (insertError.code === "23505") {
      const { data: retry } = await adminDb
        .from("households")
        .select("id, street_name, house_number")
        .eq("street_name", streetName)
        .eq("house_number", trimmedHouseNumber)
        .maybeSingle();

      if (retry) {
        return {
          householdId: retry.id,
          streetName: retry.street_name,
          houseNumber: retry.house_number,
          created: false,
        };
      }
    }

    console.error("Haushalt-Erstellung fehlgeschlagen:", insertError);
    throw new ServiceError("Haushalt konnte nicht erstellt werden.", 500);
  }

  if (!newHousehold) {
    throw new ServiceError("Haushalt konnte nicht erstellt werden.", 500);
  }

  return {
    householdId: newHousehold.id,
    streetName: newHousehold.street_name,
    houseNumber: newHousehold.house_number,
    created: true,
  };
}

// ============================================================
// Hausnummern nach Straße (Autocomplete)
// ============================================================

/**
 * Alle Hausnummern fuer eine Straße laden — natuerlich sortiert.
 * Fuer unangemeldete Nutzer im Registrierungsformular (Service-Role).
 */
export async function getHouseNumbersByStreet(
  adminDb: SupabaseClient,
  street: string,
): Promise<string[]> {
  if (!street) return [];

  const { data, error } = await adminDb
    .from("households")
    .select("house_number")
    .eq("street_name", street)
    .order("house_number");

  if (error) {
    console.error("Hausnummern-Abfrage fehlgeschlagen:", error);
    return [];
  }

  // Hausnummern natuerlich sortieren (1, 2, 3, ... 10, 11, ... statt 1, 10, 11, 2, ...)
  return (data || [])
    .map((h) => h.house_number)
    .sort((a, b) => {
      const numA = parseInt(a, 10) || 0;
      const numB = parseInt(b, 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}
