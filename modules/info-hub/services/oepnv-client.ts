// ÖPNV-Abfahrten von EFA-BW JSON API (kostenlos, kein API-Key)
import type { OepnvDeparture, OepnvStop } from "../types";
import { EFA_BW_BASE_URL } from "./oepnv-stops";

// EFA-BW Response-Typen (vereinfacht)
interface EfaDeparture {
  dateTime: { hour: string; minute: string };
  servingLine: { number: string; direction: string; name: string };
  platform: string;
  countdown: string;
  hints?: { content: string }[];
}

/**
 * Holt Echtzeit-Abfahrten fuer eine Haltestelle von EFA-BW
 * @param stopId EFA-BW Haltestellen-ID (z.B. "8506566")
 * @param stopName Anzeigename (z.B. "Bad Säckingen Bahnhof")
 * @param limit Max. Abfahrten (Default: 10)
 */
export async function fetchDepartures(
  stopId: string,
  stopName: string,
  limit: number = 10,
): Promise<OepnvStop> {
  try {
    const now = new Date();
    const params = new URLSearchParams({
      outputFormat: "JSON",
      type_dm: "stop",
      name_dm: stopId,
      useRealtime: "1",
      mode: "direct",
      limit: String(limit),
      itdDateDay: String(now.getDate()),
      itdDateMonth: String(now.getMonth() + 1),
      itdDateYear: String(now.getFullYear()),
      itdTimeHour: String(now.getHours()),
      itdTimeMinute: String(now.getMinutes()),
    });

    const res = await fetch(`${EFA_BW_BASE_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[oepnv] EFA-BW Fehler: ${res.status} ${res.statusText}`);
      return { id: stopId, name: stopName, departures: [] };
    }

    const data = await res.json();

    if (!data.departureList || !Array.isArray(data.departureList)) {
      return { id: stopId, name: stopName, departures: [] };
    }

    const departures: OepnvDeparture[] = data.departureList.map(
      (dep: EfaDeparture) => ({
        line: dep.servingLine?.number || "?",
        destination: dep.servingLine?.direction || "Unbekannt",
        time: `${dep.dateTime.hour.padStart(2, "0")}:${dep.dateTime.minute.padStart(2, "0")}`,
        platform: dep.platform || "",
        countdown: parseInt(dep.countdown, 10) || 0,
        hint: dep.hints?.[0]?.content,
      }),
    );

    return { id: stopId, name: stopName, departures };
  } catch (err) {
    console.error("[oepnv] Netzwerkfehler:", err);
    return { id: stopId, name: stopName, departures: [] };
  }
}
