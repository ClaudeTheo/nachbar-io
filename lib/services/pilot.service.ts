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
  codes: PilotHouseholdCodeSummary[];
  quarter: {
    name: string;
    slug: string;
    invite_prefix: string;
  };
}

export interface PilotHouseholdCodeSummary {
  id: string;
  code_hint: string;
  code_kind: "primary" | "replacement";
  status: "available" | "assigned" | "claimed" | "revoked" | "expired";
  batch_label: string;
  printed_at: string | null;
  claimed_at: string | null;
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
      quarter:quarters!inner(name, slug, invite_prefix),
      codes:pilot_household_access_codes(
        id,
        code_hint,
        code_kind,
        status,
        batch_label,
        printed_at,
        claimed_at
      )
    `,
    )
    .eq("quarters.invite_prefix", "PILOT")
    .order("street_name")
    .order("house_number");

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return ((data ?? []) as unknown as PilotHousehold[]).map((household) => ({
    ...household,
    codes: household.codes ?? [],
  }));
}
