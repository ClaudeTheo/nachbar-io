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

export function isLegacyDefaultPollenRegion(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const region = (value as { region?: unknown }).region;
  return (
    typeof region === "string" &&
    region.toLowerCase().includes("hohenlohe")
  );
}

/**
 * Holt Pollenflug-Daten vom DWD.
 *
 * DWD Baden-Wuerttemberg hat 3 partregion_ids:
 *   111 = Oberrhein und unteres Neckartal (Karlsruhe, Stuttgart)
 *   112 = Hohenlohe / mittlerer Neckar / Oberschwaben
 *   113 = Mittelgebirge Baden-Wuerttemberg (Schwarzwald, inkl. Hochrhein)
 *
 * Bad Saeckingen liegt am Hochrhein im suedlichen Schwarzwald → Region 113.
 *
 * Frueherer Default 112 (Welle pre-2026-05) war falsch (Hohenlohe-Region).
 *
 * @param regionId DWD Region-ID (Default: 113)
 */
export async function fetchPollenData(
  regionId: number = 113,
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
      // Fallback: gesamtes Baden-Wuerttemberg (region_id 110)
      console.warn(
        `[pollen] Region ${regionId} nicht gefunden, Fallback auf BW-Gesamtregion 110`,
      );
      const fallback = regions.find(
        (r: Record<string, unknown>) => r.region_id === 110,
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
