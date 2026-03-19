// Waste-Type Mapping: Quell-Bezeichnungen → unser Enum
// Wird von allen Connectors genutzt (ICS, CSV, API)

import type { WasteType } from "@/lib/municipal/types";

/** Bekannte Aliase fuer Muellarten (lowercase) */
const WASTE_TYPE_ALIASES: Record<string, WasteType> = {
  // Deutsch — Langformen
  "restmüll": "restmuell",
  "restmuell": "restmuell",
  "restabfall": "restmuell",
  "hausmüll": "restmuell",
  "hausmuell": "restmuell",
  "biotonne": "biomuell",
  "biomüll": "biomuell",
  "biomuell": "biomuell",
  "bioabfall": "biomuell",
  "kompost": "biomuell",
  "altpapier": "papier",
  "papier": "papier",
  "papiertonne": "papier",
  "blaue tonne": "papier",
  "gelbe tonne": "gelber_sack",
  "gelber sack": "gelber_sack",
  "gelber_sack": "gelber_sack",
  "wertstoffe": "gelber_sack",
  "verpackung": "gelber_sack",
  "verpackungen": "gelber_sack",
  "grünschnitt": "gruenschnitt",
  "gruenschnitt": "gruenschnitt",
  "gartenabfall": "gruenschnitt",
  "grüngut": "gruenschnitt",
  "gruengut": "gruenschnitt",
  "sperrmüll": "sperrmuell",
  "sperrmuell": "sperrmuell",
  "sperrgut": "sperrmuell",
  "altglas": "altglas",
  "glas": "altglas",
  "elektroschrott": "elektroschrott",
  "elektro": "elektroschrott",
  "e-schrott": "elektroschrott",
  "schadstoff": "sondermuell",
  "schadstoffe": "sondermuell",
  "schadstoffsammlung": "sondermuell",
  "sondermüll": "sondermuell",
  "sondermuell": "sondermuell",
  // Kurzformen (aus ICS-Events)
  "rest": "restmuell",
  "bio": "biomuell",
  "gelb": "gelber_sack",
  "gruen": "gruenschnitt",
  "grün": "gruenschnitt",
  "sperr": "sperrmuell",
};

/**
 * Mappt einen Quell-String auf unseren WasteType Enum.
 * Versucht exakten Match, dann Substring-Match.
 * @returns WasteType oder null wenn nicht zuordenbar
 */
export function mapWasteType(raw: string): WasteType | null {
  const normalized = raw.toLowerCase().trim();

  // Exakter Match
  if (WASTE_TYPE_ALIASES[normalized]) {
    return WASTE_TYPE_ALIASES[normalized];
  }

  // Substring-Match (laengere Aliase zuerst)
  const sortedAliases = Object.entries(WASTE_TYPE_ALIASES)
    .sort(([a], [b]) => b.length - a.length);

  for (const [alias, type] of sortedAliases) {
    if (normalized.includes(alias)) {
      return type;
    }
  }

  return null;
}

/**
 * Extrahiert den Muelltyp aus einem ICS-Event-Summary.
 * ICS-Summaries haben oft Formate wie:
 * - "Restmüll"
 * - "Biotonne (14-tägl.)"
 * - "Gelber Sack - Abholung"
 * - "Leerung Papiertonne"
 */
export function extractWasteTypeFromSummary(summary: string): WasteType | null {
  // Erst ohne Klammer-Inhalt versuchen
  const withoutParens = summary.replace(/\([^)]*\)/g, "").trim();
  const result = mapWasteType(withoutParens);
  if (result) return result;

  // Wort-fuer-Wort versuchen
  const words = withoutParens.split(/[\s\-–—,;:]+/);
  for (const word of words) {
    const wordResult = mapWasteType(word);
    if (wordResult) return wordResult;
  }

  return null;
}
