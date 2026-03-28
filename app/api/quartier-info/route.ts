import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchWeather } from "@/modules/info-hub/services/weather-client";
import { fetchPollenData } from "@/modules/info-hub/services/pollen-client";
import { fetchNinaWarnings } from "@/modules/info-hub/services/nina-client";
import { RATHAUS_LINKS } from "@/modules/info-hub/services/rathaus-links";
import { fetchDepartures } from "@/modules/info-hub/services/oepnv-client";
import { OEPNV_STOPS_BAD_SAECKINGEN } from "@/modules/info-hub/services/oepnv-stops";
import {
  APOTHEKEN_BAD_SAECKINGEN,
  NOTDIENST_URL,
} from "@/modules/info-hub/services/apotheken";
import {
  EVENTS_BAD_SAECKINGEN,
  EVENTS_CALENDAR_URL,
} from "@/modules/info-hub/services/events";
import type {
  QuartierInfoResponse,
  WasteNext,
  OepnvStop,
} from "@/modules/info-hub/types";

/**
 * GET /api/quartier-info?quarter_id=...
 *
 * Liefert alle Quartier-Informationen:
 * Wetter, Pollen, NINA-Warnungen, naechste Muellabfuhr, Rathaus-Links
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quarterId = searchParams.get("quarter_id");

  if (!quarterId) {
    return NextResponse.json(
      { error: "quarter_id erforderlich" },
      { status: 400 },
    );
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

  // 4. NINA-Warnungen — aus Cache oder Live-Fetch
  let nina = cacheMap.get("nina") as QuartierInfoResponse["nina"] | undefined;
  if (!nina) {
    try {
      nina = await fetchNinaWarnings();
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

  // 6. ÖPNV — aus Cache oder Live-Fetch (5s Timeout)
  let oepnv = cacheMap.get("oepnv") as OepnvStop[] | undefined;
  if (!oepnv) {
    try {
      const stops = await Promise.all(
        OEPNV_STOPS_BAD_SAECKINGEN.map((stop) =>
          fetchDepartures(stop.id, stop.name),
        ),
      );
      oepnv = stops;
    } catch {
      oepnv = [];
    }
  }

  // 7. Response zusammenbauen
  const response: QuartierInfoResponse = {
    weather: weather || null,
    nina: nina || [],
    pollen: pollen || null,
    waste_next: wasteNext,
    rathaus: RATHAUS_LINKS,
    oepnv: oepnv || [],
    apotheken: APOTHEKEN_BAD_SAECKINGEN,
    events: EVENTS_BAD_SAECKINGEN,
    notdienst_url: NOTDIENST_URL,
    events_calendar_url: EVENTS_CALENDAR_URL,
  };

  return NextResponse.json(response);
}
