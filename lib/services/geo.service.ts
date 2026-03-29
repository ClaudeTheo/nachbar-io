// Nachbar.io — Geo Service (Wave 5f)
// Photon Geocoding Proxy — kein Supabase noetig, reine externe API-Aufrufe.
// Wirft ServiceError bei Validierungsfehlern.

import { ServiceError } from "@/lib/services/service-error";

const PHOTON_BASE = "https://photon.komoot.io";
const TIMEOUT_MS = 5000;
const USER_AGENT = "QuartierApp/1.0 (nachbar.io)";

// ---------- Typen ----------

/** Photon GeoJSON FeatureCollection */
export interface PhotonResult {
  type: string;
  features: unknown[];
}

/** Parameter fuer reverseGeocode */
export interface ReverseGeocodeParams {
  lat: string;
  lng: string;
  lang?: string;
}

/** Parameter fuer searchAddress */
export interface SearchAddressParams {
  query: string;
  lang?: string;
  limit?: string;
}

// ---------- Hilfsfunktion ----------

/** Fetch mit Timeout + Standard-Headers */
async function photonFetch(url: string): Promise<PhotonResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { type: "FeatureCollection", features: [] };
    }

    return (await res.json()) as PhotonResult;
  } catch {
    clearTimeout(timeout);
    return { type: "FeatureCollection", features: [] };
  }
}

// ---------- Service-Funktionen ----------

/**
 * Reverse Geocoding via Photon — gibt Stadt/Stadtteil zurueck.
 * Wirft ServiceError bei fehlenden Parametern.
 */
export async function reverseGeocode(
  params: ReverseGeocodeParams,
): Promise<PhotonResult> {
  const { lat, lng, lang = "de" } = params;

  if (!lat || !lng) {
    throw new ServiceError("lat und lng sind erforderlich", 400);
  }

  const searchParams = new URLSearchParams({
    lat,
    lon: lng,
    lang,
  });

  return photonFetch(`${PHOTON_BASE}/reverse?${searchParams}`);
}

/**
 * Forward Geocoding (Adresssuche) via Photon.
 * Gibt leere FeatureCollection zurueck bei zu kurzem Query.
 */
export async function searchAddress(
  params: SearchAddressParams,
): Promise<PhotonResult> {
  const { query, lang = "de", limit = "5" } = params;

  if (!query || query.length < 3) {
    return { type: "FeatureCollection", features: [] };
  }

  // Photon erwartet separate layer-Parameter (nicht comma-separated)
  const searchParams = new URLSearchParams({
    q: query,
    lang,
    limit,
  });
  searchParams.append("layer", "house");
  searchParams.append("layer", "street");

  return photonFetch(`${PHOTON_BASE}/api/?${searchParams}`);
}
