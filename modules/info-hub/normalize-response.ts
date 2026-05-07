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

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isNinaSeverity(value: unknown): value is NinaWarning["severity"] {
  return (
    value === "Extreme" ||
    value === "Severe" ||
    value === "Moderate" ||
    value === "Minor"
  );
}

function normalizeNinaWarnings(value: unknown): NinaWarning[] {
  return toArray<Record<string, unknown>>(value).flatMap((warning) => {
    if (
      typeof warning.id !== "string" ||
      typeof warning.warning_id !== "string" ||
      !isNinaSeverity(warning.severity) ||
      typeof warning.headline !== "string" ||
      !(
        typeof warning.description === "string" ||
        warning.description === null
      ) ||
      typeof warning.sent_at !== "string" ||
      !(typeof warning.expires_at === "string" || warning.expires_at === null)
    ) {
      return [];
    }

    return [
      {
        id: warning.id,
        warning_id: warning.warning_id,
        severity: warning.severity,
        headline: warning.headline,
        description: warning.description,
        sent_at: warning.sent_at,
        expires_at: warning.expires_at,
      },
    ];
  });
}

function normalizeWasteNext(value: unknown): WasteNext[] {
  return toArray<Record<string, unknown>>(value).flatMap((waste) => {
    if (
      !isIsoDate(waste.date) ||
      typeof waste.type !== "string" ||
      typeof waste.label !== "string"
    ) {
      return [];
    }

    return [
      {
        date: waste.date,
        type: waste.type,
        label: waste.label,
      },
    ];
  });
}

function normalizeOepnvStops(value: unknown): OepnvStop[] {
  return toArray<Record<string, unknown>>(value)
    .filter(
      (stop) => typeof stop.id === "string" && typeof stop.name === "string",
    )
    .map((stop) => ({
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
    nina: normalizeNinaWarnings(record.nina),
    pollen: normalizePollen(record.pollen),
    waste_next: normalizeWasteNext(record.waste_next),
    rathaus: toArray<RathausLink>(record.rathaus),
    oepnv: normalizeOepnvStops(record.oepnv),
    apotheken: toArray<Apotheke>(record.apotheken),
    events: toArray<LocalEvent>(record.events),
    notdienst_url: toString(record.notdienst_url),
    events_calendar_url: toString(record.events_calendar_url),
  };
}
