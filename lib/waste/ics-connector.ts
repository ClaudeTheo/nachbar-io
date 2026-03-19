// ICS-Connector: Parst ICS/iCal-Feeds von Abfallwirtschaftsbetrieben
// Primaerer Connector fuer AWB Waldshut und andere Kommunen mit ICS-Download

import ical from "node-ical";
import { extractWasteTypeFromSummary } from "./type-mapping";
import type { WasteType } from "@/lib/municipal/types";

/** Rohes Ergebnis aus dem ICS-Feed */
export interface RawWasteDate {
  waste_type: WasteType;
  collection_date: string; // YYYY-MM-DD
  notes: string | null;
  time_hint: string | null;
  raw_summary: string;
}

/** Konfiguration fuer den ICS-Connector */
export interface IcsConnectorConfig {
  url?: string;           // ICS-Feed URL (Subscription oder Download)
  encoding?: string;      // Default: utf-8
  file_content?: string;  // Alternativ: ICS-Inhalt direkt uebergeben (fuer Upload)
}

/** Ergebnis eines ICS-Fetches */
export interface IcsFetchResult {
  success: boolean;
  dates: RawWasteDate[];
  skipped: number;        // Events ohne erkannten Muelltyp
  errors: string[];
  total_events: number;
}

/** Hilfsfunktion: node-ical ParameterValue → String */
function paramToString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "val" in val) {
    return String((val as { val: unknown }).val);
  }
  return String(val ?? "");
}

/**
 * Holt und parst einen ICS-Feed.
 * Unterstuetzt sowohl URL-basierte Feeds als auch direkt uebergebene ICS-Inhalte.
 */
export async function fetchIcsWasteDates(
  config: IcsConnectorConfig
): Promise<IcsFetchResult> {
  const errors: string[] = [];
  const dates: RawWasteDate[] = [];
  let skipped = 0;
  let totalEvents = 0;

  try {
    // ICS-Daten laden
    let events: ical.CalendarResponse;

    if (config.file_content) {
      events = ical.sync.parseICS(config.file_content);
    } else if (config.url) {
      events = await ical.async.fromURL(config.url);
    } else {
      return {
        success: false,
        dates: [],
        skipped: 0,
        errors: ["Weder url noch file_content konfiguriert"],
        total_events: 0,
      };
    }

    // Events durchgehen
    for (const key of Object.keys(events)) {
      const event = events[key];
      if (!event || event.type !== "VEVENT") continue;

      totalEvents++;
      const vevent = event as ical.VEvent;
      const summary = paramToString(vevent.summary);

      // Muelltyp aus Summary extrahieren
      const wasteType = extractWasteTypeFromSummary(summary);
      if (!wasteType) {
        skipped++;
        if (skipped <= 5) {
          errors.push(`Unbekannter Muelltyp: "${summary}"`);
        }
        continue;
      }

      // Datum extrahieren
      const start = vevent.start;
      if (!start) {
        errors.push(`Event ohne Datum: "${summary}"`);
        continue;
      }

      const date = start instanceof Date ? start : new Date(String(start));
      // Ganztaegige Events (VALUE=DATE) haben keine Uhrzeit →
      // toISOString() kann durch Zeitzonen-Offset einen Tag verschieben.
      // Wir verwenden daher die lokalen Date-Komponenten.
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const isoDate = `${year}-${month}-${day}`;

      // Notizen und Zeithinweis
      const description = vevent.description ? paramToString(vevent.description) : null;
      const timeHint = extractTimeHint(description || summary);

      dates.push({
        waste_type: wasteType,
        collection_date: isoDate,
        notes: description,
        time_hint: timeHint,
        raw_summary: summary,
      });
    }

    return {
      success: true,
      dates,
      skipped,
      errors,
      total_events: totalEvents,
    };
  } catch (error) {
    return {
      success: false,
      dates: [],
      skipped: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      total_events: 0,
    };
  }
}

/**
 * Extrahiert einen Zeithinweis aus dem Event-Text.
 * z.B. "ab 6:00 Uhr bereitstellen" oder "bis 7 Uhr"
 */
function extractTimeHint(text: string): string | null {
  const patterns = [
    /ab\s+\d{1,2}[:.]\d{2}\s*Uhr/i,
    /bis\s+\d{1,2}[:.]\d{2}\s*Uhr/i,
    /ab\s+\d{1,2}\s*Uhr/i,
    /bis\s+\d{1,2}\s*Uhr/i,
    /\d{1,2}[:.]\d{2}\s*Uhr\s+bereitstellen/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
}

/**
 * Health-Check: Prueft ob eine ICS-URL erreichbar ist.
 */
export async function checkIcsHealth(url: string): Promise<{
  ok: boolean;
  latency_ms: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    return {
      ok: response.ok,
      latency_ms: Date.now() - start,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
