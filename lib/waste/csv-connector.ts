// CSV-Connector: Parst CSV-Dateien mit Muellabfuhr-Terminen
// Fallback fuer Kommunen ohne ICS/API

import { mapWasteType } from "./type-mapping";
import type { RawWasteDate } from "./ics-connector";

/**
 * Erwartetes CSV-Format:
 * Datum;Muellart;Hinweis
 * 2026-04-02;Restmüll;
 * 2026-04-03;Biotonne;ab 6 Uhr bereitstellen
 *
 * Oder:
 * Datum,Muellart,Hinweis
 *
 * Trennzeichen: Semikolon oder Komma (automatisch erkannt)
 * Datumsformate: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY
 */
export function parseCsvWasteDates(content: string): {
  dates: RawWasteDate[];
  errors: string[];
} {
  const dates: RawWasteDate[] = [];
  const errors: string[] = [];

  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { dates: [], errors: ["CSV leer oder nur Header"] };
  }

  // Trennzeichen erkennen
  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  // Header ueberspringen
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 2) {
      errors.push(`Zeile ${i + 1}: Zu wenige Spalten`);
      continue;
    }

    const [rawDate, rawType, rawNote] = parts;

    // Datum parsen
    const isoDate = parseDate(rawDate);
    if (!isoDate) {
      errors.push(`Zeile ${i + 1}: Ungültiges Datum "${rawDate}"`);
      continue;
    }

    // Muelltyp parsen
    const wasteType = mapWasteType(rawType);
    if (!wasteType) {
      errors.push(`Zeile ${i + 1}: Unbekannter Mülltyp "${rawType}"`);
      continue;
    }

    dates.push({
      waste_type: wasteType,
      collection_date: isoDate,
      notes: rawNote || null,
      time_hint: null,
      raw_summary: `${rawDate} ${rawType}`,
    });
  }

  return { dates, errors };
}

/**
 * Parst verschiedene Datumsformate in ISO (YYYY-MM-DD).
 */
function parseDate(raw: string): string | null {
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // DD.MM.YYYY
  const dotMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD/MM/YYYY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}
