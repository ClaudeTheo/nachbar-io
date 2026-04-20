// Nachbar.io — PLZ-Auto-Quartier-Bildung (A3-Pivot, Mig 178)
// Wenn ein Bewohner mit voller Adresse registriert, der ausserhalb der
// bestehenden Pilot-Quartiere liegt, wird automatisch ein PLZ-Quartier
// gefunden oder neu angelegt. Erster User pro PLZ wird durch den
// Registration-Service zum quarter_admin (separater Insert in quarter_admins).
//
// Phase 1: scope='postal' (eine PLZ = ein Quartier).
// Phase 2: zusaetzlich scope='geo' (PostGIS-Cluster fuer Anlage/Hochhaus).
// Race-Safety: UNIQUE-Index idx_quarters_postal_auto_unique aus Mig 178.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface PostalQuarterResult {
  /** UUID des Quartiers */
  id: string;
  /** Anzeigename, z.B. "Quartier 79713 Bad Saeckingen" */
  name: string;
  /** true wenn dieser Aufruf das Quartier neu angelegt hat (-> Erster User
   *  in dieser PLZ -> Caller sollte ihn als quarter_admin eintragen). */
  isNew: boolean;
}

/** Normalisiert eine PLZ: trim + nur Ziffern. */
function normalizePostalCode(input: string): string {
  return (input ?? "").trim().replace(/[^0-9]/g, "");
}

/**
 * Findet ein PLZ-Quartier oder legt es neu an. Race-safe via UNIQUE-Index.
 *
 * Vorgehensweise:
 * 1. SELECT auto_created=true Quartier mit dieser PLZ
 * 2. Falls keins: INSERT versuchen
 * 3. Bei UNIQUE-Konflikt (23505): erneut SELECT (Race-Winner war jemand anderes)
 *
 * @throws Error wenn PLZ leer ist (Caller muss vorher validieren).
 */
export async function findOrCreateQuarterByPostalCode(
  adminDb: SupabaseClient,
  postalCode: string,
  city: string,
): Promise<PostalQuarterResult> {
  const plz = normalizePostalCode(postalCode);
  if (!plz) {
    throw new Error(
      "PLZ ist erforderlich fuer Auto-Quartier-Bildung (Mig 178).",
    );
  }
  const cityTrim = (city ?? "").trim();
  const displayName = cityTrim
    ? `Quartier ${plz} ${cityTrim}`
    : `Quartier ${plz}`;

  // 1. Bestehendes auto-created PLZ-Quartier suchen
  const existing = await selectAutoQuarter(adminDb, plz);
  if (existing) {
    return { id: existing.id, name: existing.name, isNew: false };
  }

  // 2. Insert versuchen
  const insertData = {
    name: displayName,
    postal_code: plz,
    city: cityTrim || null,
    country: "DE",
    auto_created: true,
    scope: "postal" as const,
  };

  const { data, error } = await adminDb
    .from("quarters")
    .insert(insertData)
    .select("id, name")
    .single();

  if (!error && data) {
    return { id: data.id, name: data.name, isNew: true };
  }

  // 3. Race-Konflikt → nochmal lesen, nimm den Race-Winner
  const errCode = (error as { code?: string } | null)?.code;
  if (errCode === "23505") {
    const winner = await selectAutoQuarter(adminDb, plz);
    if (winner) {
      return { id: winner.id, name: winner.name, isNew: false };
    }
  }

  // Andere Fehler (z.B. RLS, Schema-Drift): aussagekraeftig propagieren
  throw new Error(
    `Quartier-Auto-Bildung fuer PLZ ${plz} fehlgeschlagen: ${
      (error as { message?: string } | null)?.message ?? "unbekannt"
    }`,
  );
}

async function selectAutoQuarter(
  adminDb: SupabaseClient,
  plz: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await adminDb
    .from("quarters")
    .select("id, name")
    .eq("postal_code", plz)
    .eq("auto_created", true)
    .maybeSingle();
  return (data as { id: string; name: string } | null) ?? null;
}
