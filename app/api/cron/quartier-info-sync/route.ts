import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchWeather } from "@/lib/info/weather-client";
import { fetchPollenData } from "@/lib/info/pollen-client";
import { fetchDepartures } from "@/lib/info/oepnv-client";
import { OEPNV_STOPS_BAD_SAECKINGEN } from "@/lib/info/oepnv-stops";
import { randomUUID } from "crypto";

/**
 * GET /api/cron/quartier-info-sync
 *
 * Holt Wetter- und Pollendaten fuer alle aktiven Quartiere.
 * Vercel Cron: Stuendlich (0 * * * *)
 * Pollen wird nur 1x/Tag aktualisiert.
 */
export async function GET(request: Request) {
  const requestId = randomUUID();

  // Cron-Secret pruefen
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

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
    return NextResponse.json({ message: "Keine aktiven Quartiere", requestId });
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

    // ÖPNV holen und cachen
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
  return NextResponse.json({
    message: "Sync abgeschlossen",
    requestId,
    ...results,
  });
}
