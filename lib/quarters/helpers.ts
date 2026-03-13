// lib/quarters/helpers.ts
// Server-seitige Hilfsfunktionen fuer Quartier-Zuordnung

import { SupabaseClient } from "@supabase/supabase-js";

// Gibt die quarter_id des aktuellen Nutzers zurueck
export async function getUserQuarterId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .limit(1)
    .single();

  return (data?.households as unknown as { quarter_id: string } | null)?.quarter_id ?? null;
}

// Gibt die Rolle des Nutzers zurueck
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role ?? "user";
}
