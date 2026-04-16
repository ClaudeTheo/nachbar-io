const LGL_BW_WFS_URL =
  "https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_INSP_BW_Adr_Hauskoord_ALKIS";

export interface StructuredAddress {
  streetName: string;
  houseNumber: string;
  postalCode?: string | null;
  city?: string | null;
}

export interface SearchBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface LglBwAddressFeature extends GeoPoint {
  id: string;
  streetName: string | null;
  houseNumber: string;
  postalCode: string | null;
  city: string | null;
  specification: string | null;
}

export interface LglBwResolveResult {
  bbox: string;
  inspectedCount: number;
  match: LglBwAddressFeature | null;
  candidate: LglBwCandidate | null;
}

export type LglBwCandidateConfidence = "street_only" | "nearest_building";

export interface LglBwCandidate {
  feature: LglBwAddressFeature;
  confidence: LglBwCandidateConfidence;
  distanceMeters: number | null;
}

interface PostalDescriptor {
  city: string | null;
  postalCode: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeAddressText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/str\./g, "strasse")
    .replace(/straße/g, "strasse")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHouseNumber(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function buildSearchBoundsFromPoints(
  points: GeoPoint[],
  padding: { lat: number; lng: number } = { lat: 0.0018, lng: 0.0035 },
): SearchBounds {
  const usablePoints = points.filter(
    (point) =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lat) > 0 &&
      Math.abs(point.lng) > 0,
  );

  if (usablePoints.length === 0) {
    throw new Error("Keine nutzbaren Geo-Punkte fuer die LGL-BW-Suche vorhanden.");
  }

  const latitudes = usablePoints.map((point) => point.lat);
  const longitudes = usablePoints.map((point) => point.lng);

  return {
    minLat: clamp(Math.min(...latitudes) - padding.lat, -90, 90),
    minLng: clamp(Math.min(...longitudes) - padding.lng, -180, 180),
    maxLat: clamp(Math.max(...latitudes) + padding.lat, -90, 90),
    maxLng: clamp(Math.max(...longitudes) + padding.lng, -180, 180),
  };
}

export function expandSearchBounds(
  bounds: SearchBounds,
  padding: { lat: number; lng: number },
): SearchBounds {
  return {
    minLat: clamp(bounds.minLat - padding.lat, -90, 90),
    minLng: clamp(bounds.minLng - padding.lng, -180, 180),
    maxLat: clamp(bounds.maxLat + padding.lat, -90, 90),
    maxLng: clamp(bounds.maxLng + padding.lng, -180, 180),
  };
}

export function buildLglBwBbox(bounds: SearchBounds): string {
  return `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat},EPSG:4258`;
}

function extractPostalDescriptors(xml: string): Map<string, PostalDescriptor> {
  const descriptors = new Map<string, PostalDescriptor>();
  const pattern =
    /<ad:PostalDescriptor\b[^>]*gml:id="([^"]+)"[\s\S]*?<ad:postName>[\s\S]*?<gn:text>([^<]+)<\/gn:text>[\s\S]*?<ad:postCode>([^<]+)<\/ad:postCode>[\s\S]*?<\/ad:PostalDescriptor>/g;

  for (const match of xml.matchAll(pattern)) {
    descriptors.set(match[1], {
      city: match[2] ?? null,
      postalCode: match[3] ?? null,
    });
  }

  return descriptors;
}

function extractStreetNames(xml: string): Map<string, string> {
  const streets = new Map<string, string>();
  const pattern =
    /<ad:ThoroughfareName\b[^>]*gml:id="([^"]+)"[\s\S]*?<gn:text>([^<]+)<\/gn:text>[\s\S]*?<\/ad:ThoroughfareName>/g;

  for (const match of xml.matchAll(pattern)) {
    streets.set(match[1], match[2]);
  }

  return streets;
}

export function parseLglBwAddressFeatures(xml: string): LglBwAddressFeature[] {
  const postalDescriptors = extractPostalDescriptors(xml);
  const streetNames = extractStreetNames(xml);
  const addressBlocks = xml.match(/<ad:Address\b[\s\S]*?<\/ad:Address>/g) ?? [];
  const features: LglBwAddressFeature[] = [];

  for (const block of addressBlocks) {
    const idMatch = block.match(/<ad:Address\b[^>]*gml:id="([^"]+)"/);
    const posMatch = block.match(/<gml:pos>([^<]+)<\/gml:pos>/);
    const houseNumberMatch = block.match(
      /<ad:LocatorDesignator>[\s\S]*?<ad:designator>([^<]+)<\/ad:designator>/,
    );
    const specificationMatch = block.match(
      /<ad:specification\b[^>]*xlink:href="([^"]+)"/,
    );

    if (!idMatch || !posMatch || !houseNumberMatch) {
      continue;
    }

    const [lng, lat] = posMatch[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const componentIds = [...block.matchAll(/xlink:href="#([^"]+)"/g)].map(
      (match) => match[1],
    );
    const postalId = componentIds.find((id) => id.startsWith("PostalDescriptor."));
    const streetId = componentIds.find((id) =>
      id.startsWith("ThoroughfareName."),
    );
    const postalDescriptor = postalId
      ? postalDescriptors.get(postalId)
      : undefined;

    features.push({
      id: idMatch[1],
      lat,
      lng,
      streetName: streetId ? streetNames.get(streetId) ?? null : null,
      houseNumber: houseNumberMatch[1],
      postalCode: postalDescriptor?.postalCode ?? null,
      city: postalDescriptor?.city ?? null,
      specification: specificationMatch?.[1] ?? null,
    });
  }

  return features;
}

function isBuildingSpecification(specification: string | null): boolean {
  return specification?.toLowerCase().includes("/building") ?? false;
}

function haversineMeters(from: GeoPoint, to: GeoPoint): number {
  const earthRadius = 6_371_000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestLglBwAddress(
  features: LglBwAddressFeature[],
  address: StructuredAddress,
  hint?: GeoPoint | null,
): LglBwCandidate | null {
  const normalizedStreet = normalizeAddressText(address.streetName);
  const normalizedPostalCode = (address.postalCode ?? "").replace(/\D/g, "");
  const normalizedCity = normalizeAddressText(address.city);

  // Gleicher Straßenname + (falls vorhanden) PLZ/Ort, egal welche Hausnummer
  const streetOnly = features.filter((feature) => {
    if (!feature.streetName) return false;
    if (normalizeAddressText(feature.streetName) !== normalizedStreet)
      return false;
    if (
      normalizedPostalCode &&
      (feature.postalCode ?? "").replace(/\D/g, "") !== normalizedPostalCode
    ) {
      return false;
    }
    if (
      normalizedCity &&
      normalizeAddressText(feature.city) !== normalizedCity
    ) {
      return false;
    }
    return true;
  });

  if (streetOnly.length === 0) {
    return null;
  }

  // Bevorzugt Gebäude-Spezifikation (aussagekräftiger Pin)
  const buildings = streetOnly.filter((feature) =>
    isBuildingSpecification(feature.specification),
  );
  const pool = buildings.length > 0 ? buildings : streetOnly;
  const confidence: LglBwCandidateConfidence =
    buildings.length > 0 ? "nearest_building" : "street_only";

  let chosen: LglBwAddressFeature;
  let distanceMeters: number | null = null;

  if (hint) {
    const sorted = [...pool]
      .map((feature) => ({
        feature,
        distance: haversineMeters(hint, feature),
      }))
      .sort((left, right) => left.distance - right.distance);
    chosen = sorted[0].feature;
    distanceMeters = Math.round(sorted[0].distance);
  } else {
    chosen = pool[0];
  }

  return {
    feature: chosen,
    confidence,
    distanceMeters,
  };
}

export function findExactLglBwHouseCoordinate(
  features: LglBwAddressFeature[],
  address: StructuredAddress,
  hint?: GeoPoint | null,
): LglBwAddressFeature | null {
  const normalizedStreet = normalizeAddressText(address.streetName);
  const normalizedHouseNumber = normalizeHouseNumber(address.houseNumber);
  const normalizedPostalCode = (address.postalCode ?? "").replace(/\D/g, "");
  const normalizedCity = normalizeAddressText(address.city);

  const exactMatches = features.filter((feature) => {
    if (!feature.streetName || !isBuildingSpecification(feature.specification)) {
      return false;
    }

    if (
      normalizeAddressText(feature.streetName) !== normalizedStreet ||
      normalizeHouseNumber(feature.houseNumber) !== normalizedHouseNumber
    ) {
      return false;
    }

    if (
      normalizedPostalCode &&
      (feature.postalCode ?? "").replace(/\D/g, "") !== normalizedPostalCode
    ) {
      return false;
    }

    if (
      normalizedCity &&
      normalizeAddressText(feature.city) !== normalizedCity
    ) {
      return false;
    }

    return true;
  });

  if (exactMatches.length === 0) {
    return null;
  }

  if (!hint) {
    return exactMatches[0];
  }

  return [...exactMatches].sort(
    (left, right) => haversineMeters(hint, left) - haversineMeters(hint, right),
  )[0];
}

export async function resolveLglBwHouseCoordinate(
  address: StructuredAddress,
  bounds: SearchBounds,
  hint?: GeoPoint | null,
  fetchImpl: typeof fetch = fetch,
): Promise<LglBwResolveResult> {
  const bbox = buildLglBwBbox(bounds);
  const url = new URL(LGL_BW_WFS_URL);

  url.searchParams.set("SERVICE", "WFS");
  url.searchParams.set("REQUEST", "GetFeature");
  url.searchParams.set("VERSION", "2.0.0");
  url.searchParams.set("TYPENAMES", "ad:Address");
  url.searchParams.set("srsName", "EPSG:4258");
  url.searchParams.set("resolve", "local");
  url.searchParams.set("resolveDepth", "2");
  url.searchParams.set("BBOX", bbox);

  const response = await fetchImpl(url.toString(), {
    cache: "no-store",
    headers: {
      accept: "application/gml+xml, text/xml;q=0.9, */*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(
      `LGL-BW-WFS antwortete mit ${response.status} ${response.statusText}`,
    );
  }

  const xml = await response.text();
  const features = parseLglBwAddressFeatures(xml);
  const match = findExactLglBwHouseCoordinate(features, address, hint);

  return {
    bbox,
    inspectedCount: features.length,
    match,
    candidate: match ? null : findNearestLglBwAddress(features, address, hint),
  };
}
