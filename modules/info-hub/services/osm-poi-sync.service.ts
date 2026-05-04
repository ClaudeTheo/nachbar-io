// OSM-POI-Sync fuer Quartier-Info: Apotheken aus Overpass in municipal_config.

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { Apotheke } from "@/modules/info-hub/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_MS = 25_000;

export interface QuarterBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface SyncedPharmacy extends Apotheke {
  source: "osm-overpass";
  osmId: string;
  lat: number;
  lng: number;
  syncedAt?: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

type Fetcher = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface OsmPoiSyncResult {
  message: string;
  requestId: string;
  quarters: number;
  updated: number;
  pharmacies: number;
  errors: number;
}

export function buildOverpassPharmacyQuery(bounds: QuarterBounds): string {
  const bbox = `${bounds.swLat},${bounds.swLng},${bounds.neLat},${bounds.neLng}`;
  return [
    "[out:json][timeout:25];",
    "(",
    `node["amenity"="pharmacy"](${bbox});`,
    `way["amenity"="pharmacy"](${bbox});`,
    `relation["amenity"="pharmacy"](${bbox});`,
    `node["healthcare"="pharmacy"](${bbox});`,
    `way["healthcare"="pharmacy"](${bbox});`,
    `relation["healthcare"="pharmacy"](${bbox});`,
    ");",
    "out center tags;",
  ].join("");
}

export function parseOverpassPharmacies(data: unknown): SyncedPharmacy[] {
  const response = data as OverpassResponse;
  if (!Array.isArray(response.elements)) return [];

  const seen = new Set<string>();
  const pharmacies: SyncedPharmacy[] = [];

  for (const element of response.elements) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (!name || lat == null || lng == null) continue;

    const osmId = `${element.type}/${element.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    pharmacies.push({
      name,
      address: buildAddress(tags),
      phone: tags.phone ?? tags["contact:phone"] ?? "",
      openingHours: tags.opening_hours ?? "Nicht angegeben",
      source: "osm-overpass",
      osmId,
      lat,
      lng,
    });
  }

  return pharmacies;
}

export function mergePharmacies(
  existing: Array<Apotheke & Record<string, unknown>>,
  synced: SyncedPharmacy[],
  syncedAt = new Date().toISOString(),
): Array<Apotheke & Record<string, unknown>> {
  const manual = existing.filter((pharmacy) => !isAutoSynced(pharmacy));
  const manualNames = new Set(manual.map((pharmacy) => normalize(pharmacy.name)));
  const merged = [...manual];

  for (const pharmacy of synced) {
    if (manualNames.has(normalize(pharmacy.name))) continue;
    merged.push({ ...pharmacy, syncedAt });
  }

  return merged;
}

export async function runOsmPoiSync(
  supabase: SupabaseClient,
  options: { fetcher?: Fetcher; now?: () => Date } = {},
): Promise<OsmPoiSyncResult> {
  const requestId = randomUUID();
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const result = {
    message: "OSM-POI-Sync abgeschlossen",
    requestId,
    quarters: 0,
    updated: 0,
    pharmacies: 0,
    errors: 0,
  };

  const { data: quarters, error: quartersError } = await supabase
    .from("quarters")
    .select(
      "id, name, bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng",
    )
    .eq("status", "active");

  if (quartersError || !quarters?.length) {
    result.errors++;
    return result;
  }

  result.quarters = quarters.length;

  for (const quarter of quarters) {
    try {
      const bounds = getBounds(quarter);
      if (!bounds) {
        result.errors++;
        continue;
      }

      const synced = await fetchPharmaciesForBounds(bounds, fetcher);
      const { data: config, error: configError } = await supabase
        .from("municipal_config")
        .select("apotheken")
        .eq("quarter_id", quarter.id)
        .single();

      if (configError || !config) {
        result.errors++;
        continue;
      }

      const apotheken = mergePharmacies(
        ((config.apotheken as Array<Apotheke & Record<string, unknown>>) ??
          []),
        synced,
        now().toISOString(),
      );

      const { error: updateError } = await supabase
        .from("municipal_config")
        .update({ apotheken, updated_at: now().toISOString() })
        .eq("quarter_id", quarter.id);

      if (updateError) {
        result.errors++;
        continue;
      }

      result.updated++;
      result.pharmacies += synced.length;
    } catch (error) {
      console.error(
        JSON.stringify({
          requestId,
          event: "osm_poi_sync_error",
          quarter_id: quarter.id,
          error: String(error),
        }),
      );
      result.errors++;
    }
  }

  return result;
}

async function fetchPharmaciesForBounds(
  bounds: QuarterBounds,
  fetcher: Fetcher,
): Promise<SyncedPharmacy[]> {
  const query = buildOverpassPharmacyQuery(bounds);
  const url = `${OVERPASS_URL}?${new URLSearchParams({ data: query })}`;
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Overpass API Fehler: ${response.status ?? "unknown"}`);
  }
  return parseOverpassPharmacies(await response.json());
}

function buildAddress(tags: Record<string, string>): string {
  const street = [tags["addr:street"], tags["addr:housenumber"]]
    .filter(Boolean)
    .join(" ");
  const city = [tags["addr:postcode"], tags["addr:city"]]
    .filter(Boolean)
    .join(" ");
  return [street, city].filter(Boolean).join(", ");
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function isAutoSynced(pharmacy: Record<string, unknown>): boolean {
  return pharmacy.source === "osm-overpass" || typeof pharmacy.osmId === "string";
}

function getBounds(quarter: {
  bounds_sw_lat: number | null;
  bounds_sw_lng: number | null;
  bounds_ne_lat: number | null;
  bounds_ne_lng: number | null;
}): QuarterBounds | null {
  const { bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng } = quarter;
  if (
    bounds_sw_lat == null ||
    bounds_sw_lng == null ||
    bounds_ne_lat == null ||
    bounds_ne_lng == null
  ) {
    return null;
  }

  return {
    swLat: bounds_sw_lat,
    swLng: bounds_sw_lng,
    neLat: bounds_ne_lat,
    neLng: bounds_ne_lng,
  };
}
