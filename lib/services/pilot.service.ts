// Nachbar.io — Pilot-Service
// Pilot-spezifische Abfragen (Haushaltsliste fuer Druckansicht mit Invite-Codes).

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// Typen
// ============================================================

export interface PilotHousehold {
  id: string;
  street_name: string;
  house_number: string;
  invite_code: string;
  quarter: {
    name: string;
    slug: string;
    invite_prefix: string;
  };
}

// ============================================================
// Pilot-Haushalte
// ============================================================

/**
 * Alle Pilot-Haushalte mit Invite-Codes laden.
 * Nur Haushalte deren Quartier invite_prefix = 'PILOT' hat.
 * Sortiert nach Straße + Hausnummer.
 */
export async function getPilotHouseholds(
  adminDb: SupabaseClient,
): Promise<PilotHousehold[]> {
  const { data, error } = await adminDb
    .from("households")
    .select(
      `
      id, street_name, house_number, invite_code,
      quarter:quarters!inner(name, slug, invite_prefix)
    `,
    )
    .eq("quarters.invite_prefix", "PILOT")
    .order("street_name")
    .order("house_number");

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return (data ?? []) as unknown as PilotHousehold[];
}
