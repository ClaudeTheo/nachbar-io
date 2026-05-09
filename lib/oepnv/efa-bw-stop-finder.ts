// Welle H — EFA-BW Stop-Finder.
//
// EFA-BW (Mentz) liefert ueber XSLT_STOPFINDER_REQUEST eine Liste von
// Haltestellen in der Naehe einer Koordinate. Wir nutzen das, um pro
// Quartier-Center die naechsten Stops automatisch zu erkennen.
//
// Pure-Parser + injizierbarer fetch — Tests laufen ohne Netz.

const DEFAULT_BASE_URL =
  "https://www.efa-bw.de/nvbw/XSLT_STOPFINDER_REQUEST";

export type EfaBwStopType = "stop" | "platform" | "address" | "unknown";

export interface EfaBwStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: EfaBwStopType;
  distanceMeters: number | null;
}

export interface FindStopsOptions {
  lat: number;
  lng: number;
  /** Max. Anzahl Stops im Ergebnis. Default 5. */
  limit?: number;
  /** Timeout in ms. Default 5000. */
  timeoutMs?: number;
}

export interface FindStopsDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
}

interface RawPoint {
  name?: unknown;
  ref?: { id?: unknown; coords?: unknown };
  anyType?: unknown;
  distance?: unknown;
}

function classifyType(anyType: unknown): EfaBwStopType {
  if (anyType === "stop") return "stop";
  if (anyType === "platform") return "platform";
  if (anyType === "address") return "address";
  return "unknown";
}

function parseCoords(value: unknown): { lat: number; lng: number } | null {
  if (typeof value !== "string") return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseDistance(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parsePoint(point: RawPoint): EfaBwStop | null {
  const id = point.ref?.id;
  if (typeof id !== "string" || id.length === 0) return null;
  const coords = parseCoords(point.ref?.coords);
  if (!coords) return null;
  const name = typeof point.name === "string" ? point.name : id;
  return {
    id,
    name,
    lat: coords.lat,
    lng: coords.lng,
    type: classifyType(point.anyType),
    distanceMeters: parseDistance(point.distance),
  };
}

function extractPointArray(points: unknown): RawPoint[] {
  if (Array.isArray(points)) return points as RawPoint[];
  if (points && typeof points === "object") {
    const inner = (points as { point?: unknown }).point;
    if (Array.isArray(inner)) return inner as RawPoint[];
    if (inner && typeof inner === "object") return [inner as RawPoint];
  }
  return [];
}

export function parseStopFinderResponse(json: unknown): EfaBwStop[] {
  if (!json || typeof json !== "object") return [];
  const sf = (json as { stopFinder?: unknown }).stopFinder;
  if (!sf || typeof sf !== "object") return [];
  const points = extractPointArray((sf as { points?: unknown }).points);
  const parsed: EfaBwStop[] = [];
  for (const point of points) {
    const stop = parsePoint(point);
    if (stop) parsed.push(stop);
  }
  return parsed;
}

function buildStopFinderUrl(
  baseUrl: string,
  options: FindStopsOptions,
): string {
  const lat = options.lat;
  const lng = options.lng;
  const params = new URLSearchParams({
    outputFormat: "JSON",
    type_sf: "any",
    name_sf: `${lat}:${lng}:WGS84[DD.dddddd]`,
    coordOutputFormat: "WGS84[DD.dddddd]",
  });
  return `${baseUrl}?${params.toString()}`;
}

export async function findEfaBwStopsNearCoordinate(
  options: FindStopsOptions,
  deps?: FindStopsDeps,
): Promise<EfaBwStop[]> {
  const fetchImpl = deps?.fetch ?? fetch;
  const baseUrl = deps?.baseUrl ?? DEFAULT_BASE_URL;
  const limit = options.limit ?? 5;
  const timeoutMs = options.timeoutMs ?? 5000;
  const url = buildStopFinderUrl(baseUrl, options);

  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(
        `[efa-bw-stop-finder] HTTP ${res.status} fuer ${options.lat},${options.lng}`,
      );
      return [];
    }
    const json = await res.json();
    const stops = parseStopFinderResponse(json);
    return stops.slice(0, Math.max(0, limit));
  } catch (err) {
    console.error(
      `[efa-bw-stop-finder] Netzwerkfehler fuer ${options.lat},${options.lng}: ${String(err)}`,
    );
    return [];
  }
}
