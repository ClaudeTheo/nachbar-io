// Welle H — OEPNV Stops-Discovery-Service.
//
// Laedt Quartier-Center aus DB und ruft den EFA-BW Stop-Finder.
// Schreibt KEINE DB-Aenderung — liefert nur einen Vorschlag, den der Admin
// manuell in `municipal_config.oepnv_stops` uebernehmen kann.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  findEfaBwStopsNearCoordinate,
  type EfaBwStop,
  type FindStopsDeps,
} from "@/lib/oepnv/efa-bw-stop-finder";

export interface QuarterStopSuggestionsOptions {
  /** Max. Anzahl Stops im Ergebnis. Default 5. */
  limit?: number;
  /** Dependency-Injection fuer fetch (Tests). */
  deps?: FindStopsDeps;
}

export interface QuarterStopSuggestions {
  quarterId: string;
  quarterName: string;
  centerLat: number | null;
  centerLng: number | null;
  stops: EfaBwStop[];
  fetchedAt: string;
  errors: string[];
}

interface QuarterRow {
  id: string;
  name: string;
  center_lat: number | null;
  center_lng: number | null;
}

export async function discoverOepnvStopsForQuarter(
  supabase: SupabaseClient,
  quarterId: string,
  options: QuarterStopSuggestionsOptions = {},
): Promise<QuarterStopSuggestions> {
  const { data, error } = await supabase
    .from("quarters")
    .select("id, name, center_lat, center_lng")
    .eq("id", quarterId)
    .single();

  if (error || !data) {
    throw new Error(
      `Quartier ${quarterId} nicht gefunden: ${error?.message ?? "kein Datensatz"}`,
    );
  }

  const quarter = data as QuarterRow;
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];

  if (
    quarter.center_lat == null ||
    quarter.center_lng == null ||
    !Number.isFinite(quarter.center_lat) ||
    !Number.isFinite(quarter.center_lng)
  ) {
    errors.push(
      `Quartier ${quarter.id} hat keine Center-Koordinaten — Stop-Finder uebersprungen.`,
    );
    return {
      quarterId: quarter.id,
      quarterName: quarter.name,
      centerLat: quarter.center_lat,
      centerLng: quarter.center_lng,
      stops: [],
      fetchedAt,
      errors,
    };
  }

  const stops = await findEfaBwStopsNearCoordinate(
    {
      lat: quarter.center_lat,
      lng: quarter.center_lng,
      limit: options.limit ?? 5,
    },
    options.deps,
  );

  if (stops.length === 0) {
    errors.push(
      `Keine Stops in der Naehe gefunden (leere Antwort oder Netzfehler).`,
    );
  }

  return {
    quarterId: quarter.id,
    quarterName: quarter.name,
    centerLat: quarter.center_lat,
    centerLng: quarter.center_lng,
    stops,
    fetchedAt,
    errors,
  };
}
