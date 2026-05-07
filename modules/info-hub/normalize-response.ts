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
  const record = toRecord(value);
  if (
    !record ||
    !(typeof record.temp === "number" || record.temp === null) ||
    typeof record.description !== "string" ||
    typeof record.icon !== "string" ||
    !Array.isArray(record.forecast)
  ) {
    return null;
  }
  return value as QuartierWeather;
}

function normalizePollen(value: unknown): PollenData | null {
  const record = toRecord(value);
  const pollen = toRecord(record?.pollen);
  if (!record || !pollen || typeof record.region !== "string") return null;
  const hasOnlyPollenEntries = Object.values(pollen).every((entry) => {
    const pollenEntry = toRecord(entry);
    return (
      pollenEntry &&
      typeof pollenEntry.today === "number" &&
      typeof pollenEntry.tomorrow === "number"
    );
  });
  if (!hasOnlyPollenEntries) return null;
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
