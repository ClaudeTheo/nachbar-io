// Nachbar.io — Quartier-Info-Service
// Zentralisiert alle Quartier-Informationen (Wetter, Pollen, NINA, Muell, OEPNV etc.).
// Laedt Apotheken, Events, OEPNV-Stops und Rathaus-Links dynamisch aus municipal_config.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import {
  buildMunicipalServiceLinks,
  toMunicipalConfigArray,
  normalizeBadSaeckingenLinks,
  toServiceLinkArray,
  type ServiceLink,
} from "@/lib/municipal";
import { fetchWeather } from "@/modules/info-hub/services/weather-client";
import {
  fetchPollenData,
  isLegacyDefaultPollenRegion,
} from "@/modules/info-hub/services/pollen-client";
import { fetchDepartures } from "@/modules/info-hub/services/oepnv-client";
import { RATHAUS_LINKS } from "@/modules/info-hub/services/rathaus-links";
import type {
  QuartierInfoResponse,
  WasteNext,
  OepnvStop,
  RathausLink,
  Apotheke,
  LocalEvent,
} from "@/modules/info-hub/types";

function isBadSaeckingenCity(cityName: unknown): boolean {
  if (typeof cityName !== "string") return false;

  const normalized = cityName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return (
    normalized.includes("bad sackingen") ||
    normalized.includes("bad saeckingen")
  );
}

function describeRathausLink(label: string): string {
  const normalized = label.toLowerCase();

  if (normalized.includes("rathaus")) return "Informationen der Kommune";
  if (normalized.includes("bürgerbüro") || normalized.includes("buergerbuero")) {
    return "Anlaufstelle für Anliegen im Bürgerbüro";
  }
  if (normalized.includes("formular")) return "Formulare und Anträge";
  if (normalized.includes("veranstaltung")) return "Veranstaltungen der Kommune";
  if (normalized.includes("abfall")) return "Informationen zur Abfallwirtschaft";

  return "Kommunaler Service";
}

function toRathausLinks(
  links: Array<ServiceLink | RathausLink | (ServiceLink & { description?: string })>,
): RathausLink[] {
  return links.map((link) => ({
    ...link,
    description:
      "description" in link && typeof link.description === "string"
        ? link.description
        : describeRathausLink(link.label),
  }));
}

function getRathausLinksFromConfig(config: Record<string, unknown> | null) {
  const configuredLinks = toRathausLinks(
    toServiceLinkArray(config?.service_links),
  );
  let links = configuredLinks;

  if (links.length === 0 && isBadSaeckingenCity(config?.city_name)) {
    links = RATHAUS_LINKS;
  }

  if (links.length === 0) {
    links = toRathausLinks(
      buildMunicipalServiceLinks({
        cityName: typeof config?.city_name === "string" ? config.city_name : "",
        rathausUrl:
          typeof config?.rathaus_url === "string" ? config.rathaus_url : null,
      }),
    );
  }

  return normalizeBadSaeckingenLinks(links);
}

// ============================================================
// getQuartierInfo — Alle Quartier-Informationen sammeln
// ============================================================

export async function getQuartierInfo(
  supabase: SupabaseClient,
  quarterId: string,
): Promise<QuartierInfoResponse> {
  if (!quarterId) {
    throw new ServiceError("quarter_id erforderlich", 400);
  }

  // 0. municipal_config fuer dieses Quartier laden
  const { data: config } = await supabase
    .from("municipal_config")
    .select(
      "city_name, rathaus_url, service_links, apotheken, events, oepnv_stops, notdienst_url, events_calendar_url",
    )
    .eq("quarter_id", quarterId)
    .single();

  // Dynamische Daten aus municipal_config (oder leere Defaults)
  const rathausLinks = getRathausLinksFromConfig(config ?? null);
  const apotheken = toMunicipalConfigArray<Apotheke>(config?.apotheken);
  const events = toMunicipalConfigArray<LocalEvent>(config?.events);
  const oepnvStopConfigs: { id: string; name: string }[] =
    toMunicipalConfigArray<{ id: string; name: string }>(config?.oepnv_stops);
  const notdienstUrl: string = (config?.notdienst_url as string) || "";
  const eventsCalendarUrl: string = (config?.events_calendar_url as string) || "";

  // 1. Cache lesen
  const { data: cached } = await supabase
    .from("quartier_info_cache")
    .select("source, data")
    .eq("quarter_id", quarterId)
    .gt("expires_at", new Date().toISOString());

  const cacheMap = new Map<string, unknown>();
  if (cached) {
    for (const entry of cached) {
      cacheMap.set(entry.source, entry.data);
    }
  }

  // 2. Wetter — aus Cache oder Live-Fetch (3s Timeout)
  let weather = cacheMap.get("weather") as
    | QuartierInfoResponse["weather"]
    | undefined;
  if (!weather) {
    try {
      weather = await Promise.race([
        fetchWeather(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
    } catch {
      weather = null;
    }
  }

  // 3. Pollen — aus Cache oder Live-Fetch
  let pollen = cacheMap.get("pollen") as
    | QuartierInfoResponse["pollen"]
    | undefined;
  if (isLegacyDefaultPollenRegion(pollen)) {
    pollen = undefined;
  }
  if (!pollen) {
    try {
      pollen = await Promise.race([
        fetchPollenData(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
    } catch {
      pollen = null;
    }
  }

  // 4. Naechste Muellabfuhr aus waste_collection_dates — auf die
  // Sammelgebiete des Quartiers gescoped und ohne abgesagte Termine
  // (W6, A4:2; gleiches Muster wie app/(app)/waste-calendar/page.tsx).
  // Wichtig: /api/quartier-info laeuft mit service_role — das Scoping MUSS
  // in der Query passieren, RLS greift hier nicht.
  const wasteNext: WasteNext[] = [];
  try {
    const { data: areaLinks } = await supabase
      .from("quarter_collection_areas")
      .select("area_id")
      .eq("quarter_id", quarterId);
    const areaIds = (areaLinks ?? []).map(
      (a: { area_id: string }) => a.area_id,
    );

    if (areaIds.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: wasteDates } = await supabase
        .from("waste_collection_dates")
        .select("collection_date, waste_type, label")
        .in("area_id", areaIds)
        .eq("is_cancelled", false)
        .gte("collection_date", today)
        .order("collection_date", { ascending: true })
        .limit(3);

      if (wasteDates) {
        for (const w of wasteDates) {
          wasteNext.push({
            date: w.collection_date,
            type: w.waste_type,
            label: w.label || w.waste_type,
          });
        }
      }
    }
  } catch {
    // Muellabfuhr ist optional
  }

  // 5. OEPNV — aus Cache oder Live-Fetch mit dynamischen Haltestellen
  let oepnv = cacheMap.get("oepnv") as OepnvStop[] | undefined;
  if (!oepnv) {
    try {
      if (oepnvStopConfigs.length > 0) {
        const stops = await Promise.all(
          oepnvStopConfigs.map((stop) =>
            fetchDepartures(stop.id, stop.name),
          ),
        );
        oepnv = stops;
      } else {
        oepnv = [];
      }
    } catch {
      oepnv = [];
    }
  }

  // 6. Response zusammenbauen
  return {
    weather: weather || null,
    pollen: pollen || null,
    waste_next: wasteNext,
    rathaus: rathausLinks,
    oepnv: oepnv || [],
    apotheken,
    events,
    notdienst_url: notdienstUrl,
    events_calendar_url: eventsCalendarUrl,
  };
}
