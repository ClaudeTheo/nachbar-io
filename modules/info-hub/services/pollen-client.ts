// Pollenflug-Daten vom Deutschen Wetterdienst (DWD)
// API: https://opendata.dwd.de/climate_environment/health/alerts/s31fg.json

import type { PollenData, PollenIntensity } from "../types";

// Die 8 relevanten Pollentypen
const POLLEN_TYPES = [
  "Hasel",
  "Erle",
  "Esche",
  "Birke",
  "Graeser",
  "Roggen",
  "Beifuss",
  "Ambrosia",
] as const;

// DWD Belastungsstufen → numerischer Wert
const INTENSITY_MAP: Record<string, PollenIntensity> = {
  "0": 0,
  "0-1": 0.5,
  "1": 1,
  "1-2": 1.5,
  "2": 2,
  "2-3": 2.5,
  "3": 3,
};

function parseIntensity(value: unknown): PollenIntensity {
  if (typeof value === "string" && value in INTENSITY_MAP) {
    return INTENSITY_MAP[value];
  }
  if (typeof value === "number" && value >= 0 && value <= 3) {
    return (Math.round(value * 2) / 2) as PollenIntensity;
  }
  return 0;
}

/**
 * Holt Pollenflug-Daten vom DWD
 * Bad Saeckingen liegt in Region 112 (Oberrhein und unteres Neckartal)
 * Fallback: Region 120 (Mittelgebirge suedlich)
 * @param regionId DWD Region-ID (Default: 112)
 */
export async function fetchPollenData(
  regionId: number = 112,
): Promise<PollenData | null> {
  try {
    const url =
      "https://opendata.dwd.de/climate_environment/health/alerts/s31fg.json";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 }, // 1x taeglich reicht
    });

    if (!res.ok) {
      console.error("[pollen] DWD API Fehler:", res.status, res.statusText);
      return null;
    }

    const data = await res.json();

    // DWD JSON-Struktur: { content: [...regions...] }
    const regions = data?.content;
    if (!Array.isArray(regions)) {
      console.warn("[pollen] Unerwartetes DWD-Format");
      return null;
    }

    // Region finden (partregion_id oder region_id)
    const region = regions.find(
      (r: Record<string, unknown>) =>
        r.partregion_id === regionId || r.region_id === regionId,
    );

    if (!region) {
      console.warn(
        `[pollen] Region ${regionId} nicht gefunden, versuche Fallback 120`,
      );
      const fallback = regions.find(
        (r: Record<string, unknown>) =>
          r.partregion_id === 120 || r.region_id === 120,
      );
      if (!fallback) return null;
      return parseRegion(fallback);
    }

    return parseRegion(region);
  } catch (err) {
    console.error("[pollen] Netzwerkfehler:", err);
    return null;
  }
}

function parseRegion(region: Record<string, unknown>): PollenData {
  const regionName = String(
    region.partregion_name || region.region_name || "Unbekannt",
  );

  const pollenObj = (region.Pollen || {}) as Record<
    string,
    Record<string, unknown>
  >;
  const pollen: Record<
    string,
    { today: PollenIntensity; tomorrow: PollenIntensity }
  > = {};

  for (const type of POLLEN_TYPES) {
    const entry = pollenObj[type];
    if (entry) {
      pollen[type] = {
        today: parseIntensity(entry.today),
        tomorrow: parseIntensity(entry.tomorrow),
      };
    } else {
      pollen[type] = { today: 0, tomorrow: 0 };
    }
  }

  return { region: regionName, pollen };
}
