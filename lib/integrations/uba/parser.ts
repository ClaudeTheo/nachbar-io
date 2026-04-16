import type { Database } from "@/lib/supabase/database.types";
import type {
  UbaAirQualityComponent,
  UbaAirQualityResponse,
  UbaComponentReading,
  UbaMeasurement,
  UbaStation,
} from "./types";

type CacheInsert =
  Database["public"]["Tables"]["external_warning_cache"]["Insert"];

const COMPONENT_META: Record<
  number,
  { code: string; label: string; unit: string }
> = {
  1: { code: "PM10", label: "PM10", unit: "ug/m3" },
  3: { code: "O3", label: "Ozon", unit: "ug/m3" },
  5: { code: "NO2", label: "NO2", unit: "ug/m3" },
  9: { code: "PM2.5", label: "PM2.5", unit: "ug/m3" },
};

const SEVERITY_BY_LQI: Record<number, CacheInsert["severity"] | null> = {
  1: null,
  2: null,
  3: "minor",
  4: "moderate",
  5: "severe",
};

export function parseLatestUbaMeasurement(
  payload: UbaAirQualityResponse,
  station: UbaStation,
): UbaMeasurement | null {
  const stationBucket = payload.data?.[station.id];
  if (!stationBucket || typeof stationBucket !== "object") {
    return null;
  }

  const latestEntry = Object.entries(stationBucket).sort(([left], [right]) =>
    left.localeCompare(right),
  ).at(-1);
  if (!latestEntry) {
    return null;
  }

  const [startedAt, value] = latestEntry;
  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }

  const endedAt = typeof value[0] === "string" ? value[0] : null;
  const rawLqi = typeof value[1] === "number" ? value[1] : null;
  const dataIncomplete = Boolean(value[2]);

  if (!endedAt || rawLqi == null) {
    return null;
  }

  return {
    station,
    stationId: station.id,
    startedAt,
    endedAt,
    rawLqi,
    lqi: normalizeLqi(rawLqi),
    dataIncomplete,
    components: value
      .slice(3)
      .filter((component): component is UbaAirQualityComponent => Array.isArray(component))
      .map(normalizeComponent)
      .filter((component): component is UbaComponentReading => component !== null),
  };
}

export function toCacheRow(
  measurement: UbaMeasurement,
  ctx: { quarterId: string; ars?: string; batchId: string },
): CacheInsert | null {
  const lqi = measurement.lqi;
  if (!lqi || SEVERITY_BY_LQI[lqi] == null) {
    return null;
  }

  const stationLabel = measurement.station.city
    ? `${measurement.station.name} (${measurement.station.city})`
    : measurement.station.name;

  return {
    provider: "uba",
    external_id: measurement.station.code,
    external_version: toIsoCET(measurement.endedAt),
    quarter_id: ctx.quarterId,
    ars: ctx.ars ?? null,
    warncell_id: null,
    headline: `Luftqualitaet an Station ${stationLabel}`,
    description: buildDescription(measurement),
    instruction: buildInstruction(lqi),
    severity: SEVERITY_BY_LQI[lqi] ?? "unknown",
    category: "Health",
    event_code: `LQI_${lqi}`,
    onset_at: toIsoCET(measurement.startedAt),
    expires_at: null,
    sent_at: toIsoCET(measurement.endedAt),
    status: "active",
    raw_payload: {
      station: measurement.station,
      measurement,
    } as unknown as CacheInsert["raw_payload"],
    attribution_text: "Quelle: Umweltbundesamt, dl-de/by-2-0",
    attribution_url: "https://www.umweltbundesamt.de/daten/luft/luftdaten",
    fetch_batch_id: ctx.batchId,
  };
}

function normalizeComponent(component: UbaAirQualityComponent) {
  const meta = COMPONENT_META[component[0]];
  if (!meta) {
    return null;
  }

  return {
    componentId: component[0],
    code: meta.code,
    label: meta.label,
    unit: meta.unit,
    value: component[1],
    rawIndex: component[2],
    lqi: normalizeLqi(component[2]),
    chartValue: typeof component[3] === "string" ? component[3] : null,
  };
}

function buildDescription(measurement: UbaMeasurement) {
  const values = measurement.components
    .map((component) => `${component.code}: ${component.value} ${component.unit}`)
    .join(", ");
  const completeness = measurement.dataIncomplete
    ? " Messwerte sind unvollstaendig."
    : "";

  return `Luftqualitaetsindex ${measurement.lqi ?? "unbekannt"} an ${measurement.station.name}.${values ? ` ${values}.` : ""}${completeness}`.trim();
}

function buildInstruction(lqi: number) {
  if (lqi >= 5) {
    return "Anstrengende Aktivitaeten im Freien moeglichst vermeiden.";
  }

  if (lqi === 4) {
    return "Empfindliche Gruppen sollten anstrengende Aktivitaeten im Freien reduzieren.";
  }

  if (lqi === 3) {
    return "Empfindliche Gruppen sollten die Luftqualitaet im Blick behalten.";
  }

  return null;
}

function normalizeLqi(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (value >= 0 && value <= 4) {
    return value + 1;
  }

  if (value >= 1 && value <= 5) {
    return value;
  }

  return null;
}

function toIsoCET(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withOffset =
    /[+-]\d{2}:\d{2}$/.test(normalized) || normalized.endsWith("Z")
      ? normalized
      : `${normalized}+01:00`;
  const date = new Date(withOffset);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
