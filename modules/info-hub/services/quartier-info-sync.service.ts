// modules/info-hub/services/quartier-info-sync.service.ts
// Business-Logik fuer den stuendlichen Quartier-Info-Sync (Wetter, Pollen, OEPNV).
// Wird vom Cron-Route-Handler aufgerufen.

import { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { ServiceError } from "@/lib/services/service-error";
import { fetchWeather } from "@/modules/info-hub/services/weather-client";
import { fetchPollenData } from "@/modules/info-hub/services/pollen-client";
import { fetchDepartures } from "@/modules/info-hub/services/oepnv-client";
import { OEPNV_STOPS_BAD_SAECKINGEN } from "@/modules/info-hub/services/oepnv-stops";

export interface QuartierInfoSyncResult {
  message: string;
  requestId: string;
  weather: number;
  pollen: number;
  oepnv: number;
  errors: number;
}

/**
 * Holt Wetter-, Pollen- und OEPNV-Daten fuer alle aktiven Quartiere
 * und speichert sie im quartier_info_cache.
 */
export async function runQuartierInfoSync(
  supabase: SupabaseClient,
): Promise<QuartierInfoSyncResult> {
  const requestId = randomUUID();

  // Alle aktiven Quartiere holen
  const { data: quarters, error: qError } = await supabase
    .from("quarters")
    .select("id, lat, lon")
    .eq("active", true);

  if (qError || !quarters?.length) {
    console.error(
      JSON.stringify({
        requestId,
        event: "no_quarters",
        error: qError?.message,
      }),
    );
    throw new ServiceError("Keine aktiven Quartiere", 200);
  }

  const results = { weather: 0, pollen: 0, oepnv: 0, errors: 0 };

  for (const quarter of quarters) {
    const lat = quarter.lat || 47.5535;
    const lon = quarter.lon || 7.964;

    // Wetter holen und cachen
    try {
      const weather = await fetchWeather(lat, lon);
      await supabase.from("quartier_info_cache").upsert(
        {
          quarter_id: quarter.id,
          source: "weather",
          data: weather,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
        },
        { onConflict: "quarter_id,source" },
      );
      results.weather++;
    } catch (err) {
      console.error(
        JSON.stringify({
          requestId,
          event: "weather_error",
          quarter: quarter.id,
          error: String(err),
        }),
      );
      results.errors++;
    }

    // Pollen nur 1x/Tag — pruefen ob bereits heute gefetcht
    try {
      const { data: existing } = await supabase
        .from("quartier_info_cache")
        .select("fetched_at")
        .eq("quarter_id", quarter.id)
        .eq("source", "pollen")
        .single();

      const today = new Date().toISOString().slice(0, 10);
      const lastFetch = existing?.fetched_at?.slice(0, 10);

      if (lastFetch !== today) {
        const pollen = await fetchPollenData();
        if (pollen) {
          await supabase.from("quartier_info_cache").upsert(
            {
              quarter_id: quarter.id,
              source: "pollen",
              data: pollen,
              fetched_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(), // 24h
            },
            { onConflict: "quarter_id,source" },
          );
          results.pollen++;
        }
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          requestId,
          event: "pollen_error",
          quarter: quarter.id,
          error: String(err),
        }),
      );
      results.errors++;
    }

    // OEPNV holen und cachen
    try {
      const stops = await Promise.all(
        OEPNV_STOPS_BAD_SAECKINGEN.map((stop) =>
          fetchDepartures(stop.id, stop.name),
        ),
      );
      await supabase.from("quartier_info_cache").upsert(
        {
          quarter_id: quarter.id,
          source: "oepnv",
          data: stops,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h
        },
        { onConflict: "quarter_id,source" },
      );
      results.oepnv++;
    } catch (err) {
      console.error(
        JSON.stringify({
          requestId,
          event: "oepnv_error",
          quarter: quarter.id,
          error: String(err),
        }),
      );
      results.errors++;
    }
  }

  console.log(
    JSON.stringify({ requestId, event: "quartier_info_sync_done", ...results }),
  );

  return {
    message: "Sync abgeschlossen",
    requestId,
    ...results,
  };
}
