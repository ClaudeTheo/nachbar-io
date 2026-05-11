// lib/doctors/osm-doctors-client.ts
// Nachbar.io — OSM Overpass-Client fuer Aerzte-Discovery.
//
// Datenquelle: Overpass-API (https://overpass-api.de/api/interpreter).
// Tag-Filter: amenity=doctors | clinic | hospital, oder healthcare=doctor.
// AVV: keine — oeffentliche OSM-Daten ohne Personenbezug ueber den Praxis-Eintrag hinaus.
//
// Founder-Entscheidungen 2026-05-11 (siehe Plan):
//   1a Whitelist-Mapping OSM-Tag → KBV-Begriff, Fallback "Allgemein".
//
// Rate-Limit: Overpass empfiehlt 1 Request/Sekunde — pro Quartier-Onboarding
// nur ein Aufruf, also unkritisch.

import { calculateDistance } from "@/lib/geo/haversine";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Whitelist: OSM-Tag-Wert → KBV-Fachgebiet.
// Quelle: https://wiki.openstreetmap.org/wiki/Key:healthcare:speciality
const OSM_SPECIALITY_MAP: Record<string, string> = {
  general: "Allgemein",
  general_practitioner: "Allgemein",
  family_medicine: "Allgemein",
  internal_medicine: "Innere Medizin",
  ophthalmology: "Augenheilkunde",
  orthopaedics: "Orthopaedie",
  orthopedics: "Orthopaedie",
  paediatrics: "Kinderheilkunde",
  pediatrics: "Kinderheilkunde",
  gynaecology: "Frauenheilkunde",
  gynecology: "Frauenheilkunde",
  dermatology: "Dermatologie",
  cardiology: "Kardiologie",
  ent: "Hals-Nasen-Ohren",
  otolaryngology: "Hals-Nasen-Ohren",
};

export interface OsmDoctorCandidate {
  source: "osm";
  source_ref: string;
  name: string;
  specialization: string[];
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Holt Aerzte aus OSM Overpass-API im Umkreis (km) um ein Quartier-Zentrum.
 *
 * @param centerLat Quartier-Mittelpunkt Breitengrad
 * @param centerLng Quartier-Mittelpunkt Laengengrad
 * @param radiusKm Suchradius in km (Default 10)
 * @param fetchImpl Override fuer Tests
 */
export async function fetchDoctorsFromOSM(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 10,
  fetchImpl: typeof fetch = fetch,
): Promise<OsmDoctorCandidate[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  // Overpass-Query: 3 Filter (amenity=doctors|clinic|hospital ODER healthcare=doctor)
  // alle innerhalb radius, mit center fuer ways/relations.
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="doctors"](around:${radiusMeters},${centerLat},${centerLng});
      node["amenity"="clinic"](around:${radiusMeters},${centerLat},${centerLng});
      node["amenity"="hospital"](around:${radiusMeters},${centerLat},${centerLng});
      node["healthcare"="doctor"](around:${radiusMeters},${centerLat},${centerLng});
      way["amenity"="doctors"](around:${radiusMeters},${centerLat},${centerLng});
      way["amenity"="clinic"](around:${radiusMeters},${centerLat},${centerLng});
      way["amenity"="hospital"](around:${radiusMeters},${centerLat},${centerLng});
      way["healthcare"="doctor"](around:${radiusMeters},${centerLat},${centerLng});
    );
    out center tags;
  `.trim();

  const response = await fetchImpl(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass-API HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OverpassResponse;
  return parseOverpassElements(payload.elements ?? [], centerLat, centerLng);
}

/**
 * Wandelt Overpass-Elements in Doctor-Candidates um.
 * Exportiert fuer Tests + Wiederverwendung in Cron.
 */
export function parseOverpassElements(
  elements: OverpassElement[],
  centerLat: number,
  centerLng: number,
): OsmDoctorCandidate[] {
  const candidates: OsmDoctorCandidate[] = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const tags = el.tags ?? {};
    const name = tags["name"]?.trim();
    if (!name) continue; // ohne Namen unbrauchbar fuer Senior-Anzeige

    candidates.push({
      source: "osm",
      source_ref: `${el.type}/${el.id}`,
      name,
      specialization: extractSpecialization(tags),
      address: buildAddress(tags),
      phone: tags["phone"] ?? tags["contact:phone"] ?? null,
      website: tags["website"] ?? tags["contact:website"] ?? null,
      email: tags["email"] ?? tags["contact:email"] ?? null,
      latitude: lat,
      longitude: lng,
      distance_km: calculateDistance(centerLat, centerLng, lat, lng),
    });
  }

  // Duplikate nach source_ref entfernen (kann passieren wenn way + node fuer
  // dieselbe Praxis getaggt sind — wir nehmen den ersten Eintrag).
  const seen = new Set<string>();
  const deduped: OsmDoctorCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.source_ref)) continue;
    seen.add(c.source_ref);
    deduped.push(c);
  }

  // Nach Distanz aufsteigend sortieren.
  deduped.sort((a, b) => a.distance_km - b.distance_km);
  return deduped;
}

/**
 * Mappt OSM-Tags auf KBV-Whitelist (Founder 1a).
 * Fallback "Allgemein" wenn kein Match.
 */
export function extractSpecialization(tags: Record<string, string>): string[] {
  const rawValues = [
    tags["healthcare:speciality"],
    tags["healthcare:speciality_1"],
    tags["healthcare:speciality_2"],
    tags["healthcare:speciality_3"],
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  const result = new Set<string>();
  for (const raw of rawValues) {
    for (const part of raw.split(/[;,]/)) {
      const key = part.trim().toLowerCase();
      if (OSM_SPECIALITY_MAP[key]) {
        result.add(OSM_SPECIALITY_MAP[key]);
      }
    }
  }

  if (result.size === 0) {
    return ["Allgemein"];
  }
  return Array.from(result);
}

function buildAddress(tags: Record<string, string>): string | null {
  const street = tags["addr:street"];
  const housenumber = tags["addr:housenumber"];
  const postcode = tags["addr:postcode"];
  const city = tags["addr:city"];
  const parts: string[] = [];
  if (street) {
    parts.push(housenumber ? `${street} ${housenumber}` : street);
  }
  if (postcode || city) {
    parts.push([postcode, city].filter(Boolean).join(" "));
  }
  if (parts.length === 0) return null;
  return parts.join(", ");
}
