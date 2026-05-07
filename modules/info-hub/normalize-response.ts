import type {
  Apotheke,
  LocalEvent,
  NinaWarning,
  OepnvDeparture,
  OepnvStop,
  PollenData,
  QuartierInfoResponse,
  QuartierWeather,
  RathausLink,
  WasteNext,
} from "./types";

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeOepnvStops(value: unknown): OepnvStop[] {
  return toArray<Record<string, unknown>>(value).map((stop) => ({
    ...(stop as Omit<OepnvStop, "departures">),
    departures: toArray<OepnvDeparture>(stop.departures),
  }));
}

function normalizeWeather(value: unknown): QuartierWeather | null {
  return toRecord(value) ? (value as QuartierWeather) : null;
}

function normalizePollen(value: unknown): PollenData | null {
  const record = toRecord(value);
  if (!record || !toRecord(record.pollen)) return null;
  return value as PollenData;
}

export function normalizeQuartierInfoResponse(
  value: unknown,
): QuartierInfoResponse {
  const record = toRecord(value) ?? {};

  return {
    weather: normalizeWeather(record.weather),
    nina: toArray<NinaWarning>(record.nina),
    pollen: normalizePollen(record.pollen),
    waste_next: toArray<WasteNext>(record.waste_next),
    rathaus: toArray<RathausLink>(record.rathaus),
    oepnv: normalizeOepnvStops(record.oepnv),
    apotheken: toArray<Apotheke>(record.apotheken),
    events: toArray<LocalEvent>(record.events),
    notdienst_url: toString(record.notdienst_url),
    events_calendar_url: toString(record.events_calendar_url),
  };
}
