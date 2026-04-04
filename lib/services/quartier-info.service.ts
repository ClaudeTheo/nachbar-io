// Nachbar.io — Quartier-Info-Service
// Zentralisiert alle Quartier-Informationen (Wetter, Pollen, NINA, Muell, OEPNV etc.).
// Laedt Apotheken, Events, OEPNV-Stops und Rathaus-Links dynamisch aus municipal_config.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { fetchWeather } from "@/modules/info-hub/services/weather-client";
import { fetchPollenData } from "@/modules/info-hub/services/pollen-client";
import { fetchNinaWarnings } from "@/modules/info-hub/services/nina-client";
import { fetchDepartures } from "@/modules/info-hub/services/oepnv-client";
import type {
  QuartierInfoResponse,
  WasteNext,
  OepnvStop,
  RathausLink,
  Apotheke,
  LocalEvent,
} from "@/modules/info-hub/types";

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
      "service_links, apotheken, events, oepnv_stops, notdienst_url, events_calendar_url",
    )
    .eq("quarter_id", quarterId)
    .single();

  // Dynamische Daten aus municipal_config (oder leere Defaults)
  const rathausLinks: RathausLink[] = (config?.service_links as RathausLink[]) || [];
  const apotheken: Apotheke[] = (config?.apotheken as Apotheke[]) || [];
  const events: LocalEvent[] = (config?.events as LocalEvent[]) || [];
  const oepnvStopConfigs: { id: string; name: string }[] =
    (config?.oepnv_stops as { id: string; name: string }[]) || [];
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

  // 4. NINA-Warnungen — nur wenn AGS fuer das Quartier konfiguriert ist
  let nina = cacheMap.get("nina") as QuartierInfoResponse["nina"] | undefined;
  if (!nina) {
    try {
      const { data: quarterData } = await supabase
        .from("quarters")
        .select("settings")
        .eq("id", quarterId)
        .single();
      const ninaAgs = quarterData?.settings?.nina_ags;
      if (ninaAgs) {
        nina = await fetchNinaWarnings(ninaAgs);
      } else {
        nina = [];
      }
    } catch {
      nina = [];
    }
  }

  // 5. Naechste Muellabfuhr aus waste_collection_dates
  const wasteNext: WasteNext[] = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: wasteDates } = await supabase
      .from("waste_collection_dates")
      .select("collection_date, waste_type, label")
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
  } catch {
    // Muellabfuhr ist optional
  }

  // 6. OEPNV — aus Cache oder Live-Fetch mit dynamischen Haltestellen
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

  // 7. Response zusammenbauen
  return {
    weather: weather || null,
    nina: nina || [],
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
