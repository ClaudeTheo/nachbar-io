// ICS-Connector: Parst ICS/iCal-Feeds von Abfallwirtschaftsbetrieben
// Eigener leichtgewichtiger Parser (kein node-ical — BigInt-Problem mit Turbopack)

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
  url?: string; // ICS-Feed URL (Subscription oder Download)
  encoding?: string; // Default: utf-8
  file_content?: string; // Alternativ: ICS-Inhalt direkt uebergeben (fuer Upload)
}

/** Ergebnis eines ICS-Fetches */
export interface IcsFetchResult {
  success: boolean;
  dates: RawWasteDate[];
  skipped: number; // Events ohne erkannten Muelltyp
  errors: string[];
  total_events: number;
}

/** Geparster VEVENT-Block */
interface ParsedVEvent {
  summary: string;
  dtstart: string; // Roh-Wert aus DTSTART
  dtstart_is_date: boolean; // VALUE=DATE (ganztaegig)
  description: string | null;
}

/**
 * Parst ICS-Text in VEVENT-Bloecke.
 * Leichtgewichtiger Parser — unterstuetzt VEVENT mit SUMMARY, DTSTART, DESCRIPTION.
 */
function parseIcsText(icsText: string): ParsedVEvent[] {
  const events: ParsedVEvent[] = [];
  const lines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // RFC 5545: Zeilen die mit Whitespace beginnen sind Fortsetzungen
  const unfolded: string[] = [];
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.slice(1);
      }
    } else {
      unfolded.push(line);
    }
  }

  let inEvent = false;
  let summary = "";
  let dtstart = "";
  let dtstartIsDate = false;
  let description: string | null = null;

  for (const line of unfolded) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      summary = "";
      dtstart = "";
      dtstartIsDate = false;
      description = null;
      continue;
    }

    if (line === "END:VEVENT") {
      if (inEvent && dtstart && summary) {
        events.push({
          summary,
          dtstart,
          dtstart_is_date: dtstartIsDate,
          description,
        });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    // SUMMARY (mit optionalem LANGUAGE-Parameter)
    if (line.startsWith("SUMMARY")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx >= 0) summary = line.slice(colonIdx + 1).trim();
    }

    // DTSTART — ganztaegig (VALUE=DATE:YYYYMMDD) oder mit Zeit
    if (line.startsWith("DTSTART")) {
      dtstartIsDate = line.includes("VALUE=DATE");
      const colonIdx = line.indexOf(":");
      if (colonIdx >= 0) dtstart = line.slice(colonIdx + 1).trim();
    }

    // DESCRIPTION
    if (line.startsWith("DESCRIPTION")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx >= 0) {
        const val = line.slice(colonIdx + 1).trim();
        description = val || null;
      }
    }
  }

  return events;
}

/**
 * Wandelt DTSTART-Wert in YYYY-MM-DD um.
 * Formate: YYYYMMDD (ganztaegig) oder YYYYMMDDTHHmmss(Z)
 */
function dtstartToDate(raw: string, _isDate: boolean): string | null {
  // Nur Ziffern und T/Z behalten
  const cleaned = raw.replace(/[^0-9TZ]/g, "");
  if (cleaned.length < 8) return null;

  const year = cleaned.slice(0, 4);
  const month = cleaned.slice(4, 6);
  const day = cleaned.slice(6, 8);

  // Validierung
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (y < 2020 || y > 2040 || m < 1 || m > 12 || d < 1 || d > 31) return null;

  return `${year}-${month}-${day}`;
}

/**
 * Holt und parst einen ICS-Feed.
 * Unterstuetzt sowohl URL-basierte Feeds als auch direkt uebergebene ICS-Inhalte.
 */
export async function fetchIcsWasteDates(
  config: IcsConnectorConfig,
): Promise<IcsFetchResult> {
  const errors: string[] = [];
  const dates: RawWasteDate[] = [];
  let skipped = 0;
  let totalEvents = 0;

  try {
    let icsText: string;

    if (config.file_content) {
      icsText = config.file_content;
    } else if (config.url) {
      const response = await fetch(config.url, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        return {
          success: false,
          dates: [],
          skipped: 0,
          errors: [`HTTP ${response.status}: ${response.statusText}`],
          total_events: 0,
        };
      }
      icsText = await response.text();
    } else {
      return {
        success: false,
        dates: [],
        skipped: 0,
        errors: ["Weder url noch file_content konfiguriert"],
        total_events: 0,
      };
    }

    // ICS-Validierung
    if (!icsText.includes("BEGIN:VCALENDAR")) {
      return {
        success: false,
        dates: [],
        skipped: 0,
        errors: ["Kein gueltiges ICS-Format (BEGIN:VCALENDAR fehlt)"],
        total_events: 0,
      };
    }

    // Events parsen
    const events = parseIcsText(icsText);
    totalEvents = events.length;

    for (const event of events) {
      // Muelltyp aus Summary extrahieren
      const wasteType = extractWasteTypeFromSummary(event.summary);
      if (!wasteType) {
        skipped++;
        if (skipped <= 5) {
          errors.push(`Unbekannter Muelltyp: "${event.summary}"`);
        }
        continue;
      }

      // Datum extrahieren
      const isoDate = dtstartToDate(event.dtstart, event.dtstart_is_date);
      if (!isoDate) {
        errors.push(`Ungueltiges Datum: "${event.dtstart}" (${event.summary})`);
        continue;
      }

      // Zeithinweis
      const timeHint = extractTimeHint(event.description || event.summary);

      dates.push({
        waste_type: wasteType,
        collection_date: isoDate,
        notes: event.description,
        time_hint: timeHint,
        raw_summary: event.summary,
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
