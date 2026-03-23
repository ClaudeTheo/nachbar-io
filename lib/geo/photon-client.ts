// Photon Geocoding Client (komoot.de)
// DSGVO-konform, kostenlos, OSM-basiert
// Browser-Requests laufen ueber /api/geo/* Proxy (CORS/DNS),
// Server-Requests gehen direkt an photon.komoot.de

const PHOTON_DIRECT = 'https://photon.komoot.de'
const TIMEOUT_MS = 3000
const MIN_QUERY_LENGTH = 3

// Im Browser den lokalen Proxy verwenden, auf dem Server direkt Photon
function isServer(): boolean {
  return typeof window === 'undefined'
}

export interface AddressSuggestion {
  street: string
  postalCode: string
  city: string
  state: string
  country: string // ISO 2-letter: 'DE', 'AT', 'CH'
  lat: number
  lng: number
  displayText: string
}

export interface ReverseGeocodeResult {
  city: string
  district?: string
  state: string
  country: string
  quarterName: string
}

export interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    postcode?: string
    city?: string
    district?: string
    state?: string
    country?: string
    osm_id?: number
  }
}

// Photon gibt "Deutschland" statt "DE" zurueck
function countryToISO(country?: string): string {
  const map: Record<string, string> = {
    'Deutschland': 'DE',
    'Germany': 'DE',
    'Österreich': 'AT',
    'Austria': 'AT',
    'Schweiz': 'CH',
    'Switzerland': 'CH',
  }
  return map[country ?? ''] ?? country ?? 'DE'
}

/**
 * Adress-Autocomplete via Photon Forward Geocoding
 * Gibt leeres Array zurueck bei Fehler oder zu kurzem Query
 */
export async function searchAddress(
  query: string,
  lang = 'de',
  limit = 5,
  countryCode?: string
): Promise<AddressSuggestion[]> {
  if (query.length < MIN_QUERY_LENGTH) return []

  try {
    const params = new URLSearchParams({
      q: query,
      lang,
      limit: String(limit),
    })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const url = isServer()
      ? `${PHOTON_DIRECT}/api/?${params}`
      : `/api/geo/search?${params}`
    const res = await fetch(url, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []

    const data = await res.json()
    const features: PhotonFeature[] = data.features ?? []

    return features
      .filter((f) => {
        if (!countryCode) return true
        return countryToISO(f.properties.country) === countryCode
      })
      .map((f) => {
        const p = f.properties
        const street = p.name ?? p.street ?? ''
        const postalCode = p.postcode ?? ''
        const city = p.city ?? ''
        const country = countryToISO(p.country)

        return {
          street,
          postalCode,
          city,
          state: p.state ?? '',
          country,
          lat: f.geometry.coordinates[1], // Photon: [lng, lat]
          lng: f.geometry.coordinates[0],
          displayText: [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        }
      })
  } catch {
    return []
  }
}

/**
 * Reverse Geocoding — gibt Stadt + Stadtteil zurueck fuer Quartier-Namensgenerierung
 * Gibt null zurueck bei Fehler
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  lang = 'de'
): Promise<ReverseGeocodeResult | null> {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), lang })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const url = isServer()
      ? `${PHOTON_DIRECT}/reverse?${params}`
      : `/api/geo/reverse?lat=${lat}&lng=${lng}&lang=${lang}`
    const res = await fetch(url, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const data = await res.json()
    const feature: PhotonFeature | undefined = data.features?.[0]
    if (!feature) return null

    const p = feature.properties
    const city = p.city ?? ''
    const district = p.district
    const suffix = district ?? p.street ?? p.name ?? ''
    const quarterName = suffix ? `${city} — ${suffix}` : city

    return {
      city,
      district,
      state: p.state ?? '',
      country: countryToISO(p.country),
      quarterName,
    }
  } catch {
    return null
  }
}
