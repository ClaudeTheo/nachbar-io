import type {
  Apotheke,
  LocalEvent,
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

function normalizeRathausLinks(value: unknown): RathausLink[] {
  return toArray<Record<string, unknown>>(value).flatMap((link) => {
    if (
      typeof link.label !== "string" ||
      typeof link.description !== "string" ||
      typeof link.url !== "string" ||
      typeof link.icon !== "string"
    ) {
      return [];
    }

    return [
      {
        label: link.label,
        description: link.description,
        url: link.url,
        icon: link.icon,
      },
    ];
  });
}

function normalizeApotheken(value: unknown): Apotheke[] {
  return toArray<Record<string, unknown>>(value).flatMap((apotheke) => {
    if (
      typeof apotheke.name !== "string" ||
      typeof apotheke.address !== "string" ||
      typeof apotheke.phone !== "string" ||
      typeof apotheke.openingHours !== "string"
    ) {
      return [];
    }

    return [
      {
        name: apotheke.name,
        address: apotheke.address,
        phone: apotheke.phone,
        openingHours: apotheke.openingHours,
      },
    ];
  });
}

function normalizeEvents(value: unknown): LocalEvent[] {
  return toArray<Record<string, unknown>>(value).flatMap((event) => {
    if (
      typeof event.title !== "string" ||
      typeof event.description !== "string" ||
      typeof event.schedule !== "string" ||
      typeof event.location !== "string" ||
      typeof event.icon !== "string"
    ) {
      return [];
    }

    return [
      {
        title: event.title,
        description: event.description,
        schedule: event.schedule,
        location: event.location,
        icon: event.icon,
      },
    ];
  });
}

function normalizeOepnvDepartures(value: unknown): OepnvDeparture[] {
  return toArray<Record<string, unknown>>(value).flatMap((departure) => {
    if (
      typeof departure.line !== "string" ||
      typeof departure.destination !== "string" ||
      typeof departure.time !== "string" ||
      typeof departure.platform !== "string" ||
      typeof departure.countdown !== "number"
    ) {
      return [];
    }

    const normalized: OepnvDeparture = {
      line: departure.line,
      destination: departure.destination,
      time: departure.time,
      platform: departure.platform,
      countdown: departure.countdown,
    };

    if (typeof departure.hint === "string") {
      normalized.hint = departure.hint;
    }

    return [normalized];
  });
}

function normalizeOepnvStops(value: unknown): OepnvStop[] {
  return toArray<Record<string, unknown>>(value)
    .filter(
      (stop) => typeof stop.id === "string" && typeof stop.name === "string",
    )
    .map((stop) => ({
      ...(stop as Omit<OepnvStop, "departures">),
      departures: normalizeOepnvDepartures(stop.departures),
    }));
}

function normalizeWeatherForecast(value: unknown): QuartierWeather["forecast"] {
  return toArray<Record<string, unknown>>(value).flatMap((day) => {
    if (
      typeof day.day !== "string" ||
      typeof day.tempMax !== "number" ||
      typeof day.icon !== "string"
    ) {
      return [];
    }

    return [
      {
        day: day.day,
        tempMax: day.tempMax,
        icon: day.icon,
      },
    ];
  });
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
  return {
    temp: record.temp,
    description: record.description,
    icon: record.icon,
    forecast: normalizeWeatherForecast(record.forecast),
  };
}

function isPollenIntensity(
  value: unknown,
): value is PollenData["pollen"][string]["today"] {
  return (
    value === 0 ||
    value === 0.5 ||
    value === 1 ||
    value === 1.5 ||
    value === 2 ||
    value === 2.5 ||
    value === 3
  );
}

function normalizePollen(value: unknown): PollenData | null {
  const record = toRecord(value);
  const pollen = toRecord(record?.pollen);
  if (!record || !pollen || typeof record.region !== "string") return null;

  const normalizedPollen: PollenData["pollen"] = {};
  for (const [name, entry] of Object.entries(pollen)) {
    const pollenEntry = toRecord(entry);
    if (
      pollenEntry &&
      isPollenIntensity(pollenEntry.today) &&
      isPollenIntensity(pollenEntry.tomorrow)
    ) {
      normalizedPollen[name] = {
        today: pollenEntry.today,
        tomorrow: pollenEntry.tomorrow,
      };
    }
  }

  return {
    region: record.region,
    pollen: normalizedPollen,
  };
}

export function normalizeQuartierInfoResponse(
  value: unknown,
): QuartierInfoResponse {
  const record = toRecord(value) ?? {};

  return {
    weather: normalizeWeather(record.weather),
    pollen: normalizePollen(record.pollen),
    waste_next: normalizeWasteNext(record.waste_next),
    rathaus: normalizeRathausLinks(record.rathaus),
    oepnv: normalizeOepnvStops(record.oepnv),
    apotheken: normalizeApotheken(record.apotheken),
    events: normalizeEvents(record.events),
    notdienst_url: toString(record.notdienst_url),
    events_calendar_url: toString(record.events_calendar_url),
  };
}
