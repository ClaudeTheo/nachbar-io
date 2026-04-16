import { haversineDistance } from "@/lib/geo";
import { fetchWithRetry } from "@/lib/integrations/__shared__/http";
import type {
  UbaAirQualityResponse,
  UbaStation,
  UbaStationsResponse,
} from "./types";

const UBA_BASE = "https://www.umweltbundesamt.de/api/air_data/v2";
const BW_NETWORK_CODE = "BW";

export async function fetchUbaStations(): Promise<UbaStation[]> {
  const payload = await fetchWithRetry<UbaStationsResponse>(
    `${UBA_BASE}/stations/json?lang=de`,
    { timeoutMs: 15_000 },
  );

  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("Unerwartete UBA-Stationenantwort");
  }

  return Object.entries(payload.data)
    .map(([stationId, row]) => normalizeStationRow(stationId, row))
    .filter((station): station is UbaStation => station !== null);
}

export function selectNearestBwStations(
  stations: UbaStation[],
  center: { lat: number; lng: number },
  limit = 3,
): UbaStation[] {
  return [...stations]
    .filter((station) => isBwStation(station) && isActiveStation(station))
    .sort(
      (left, right) =>
        haversineDistance(
          center.lat,
          center.lng,
          left.latitude,
          left.longitude,
        ) -
        haversineDistance(
          center.lat,
          center.lng,
          right.latitude,
          right.longitude,
        ),
    )
    .slice(0, limit);
}

export async function fetchUbaAirQuality(
  stationCode: string,
  options?: { dateFrom?: Date; dateTo?: Date },
): Promise<UbaAirQualityResponse> {
  const url = buildUbaAirQualityUrl(stationCode, options);
  return fetchWithRetry<UbaAirQualityResponse>(url, { timeoutMs: 15_000 });
}

export function buildUbaAirQualityUrl(
  stationCode: string,
  options?: { dateFrom?: Date; dateTo?: Date },
): string {
  const dateTo = options?.dateTo ?? new Date();
  const dateFrom = options?.dateFrom ?? addDays(dateTo, -1);
  const params = new URLSearchParams({
    date_from: formatDateLocal(dateFrom),
    date_to: formatDateLocal(dateTo),
    time_from: "1",
    time_to: "24",
    station: stationCode,
    lang: "de",
  });

  return `${UBA_BASE}/airquality/json?${params.toString()}`;
}

function normalizeStationRow(
  stationId: string,
  row: Array<string | number | null>,
): UbaStation | null {
  const code = valueAt(row, 1);
  const name = valueAt(row, 2);
  const longitude = numberAt(row, 7);
  const latitude = numberAt(row, 8);

  if (!code || !name || longitude == null || latitude == null) {
    return null;
  }

  return {
    id: stationId,
    code,
    name,
    city: valueAt(row, 3),
    activeFrom: valueAt(row, 5),
    activeTo: valueAt(row, 6),
    longitude,
    latitude,
    networkCode: valueAt(row, 12),
  };
}

function isBwStation(station: UbaStation) {
  return station.networkCode === BW_NETWORK_CODE;
}

function isActiveStation(station: UbaStation) {
  if (!station.activeTo) {
    return true;
  }

  const until = new Date(station.activeTo);
  return !Number.isNaN(until.getTime()) && until.getTime() > Date.now();
}

function valueAt(row: Array<string | number | null>, index: number) {
  const value = row[index];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function numberAt(row: Array<string | number | null>, index: number) {
  const value = row[index];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, offset: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + offset);
  return copy;
}
