// Amtsblatt-Integration: PDF-Scraping, Text-Extraktion, KI-Strukturierung
// Trompeterblättle Bad Säckingen — erscheint 14-tägig samstags

import type { AmtsblattExtractedItem, AnnouncementCategory } from "./types";

// --- Konfiguration ---

/** URL der Amtsblatt-Übersichtsseite */
export const AMTSBLATT_PAGE_URL =
  "https://www.bad-saeckingen.de/unsere-stadt/stadt-bad-saeckingen/amtsblatt";

/** Basis-URL fuer PDF-Downloads */
export const AMTSBLATT_PDF_BASE =
  "https://www.bad-saeckingen.de/fileadmin/Dateien/Website/Dateien/Amtsblatt/";

/** Gueltige Kategorien fuer Amtsblatt-Meldungen */
const VALID_CATEGORIES: AnnouncementCategory[] = [
  "verkehr", "baustelle", "veranstaltung", "verwaltung",
  "warnung", "sonstiges", "verein", "soziales", "entsorgung",
];

// --- PDF-URL-Erkennung ---

/**
 * Extrahiert alle Amtsblatt-PDF-URLs aus dem HTML der Uebersichtsseite.
 * URL-Pattern: /fileadmin/Dateien/Website/Dateien/Amtsblatt/26_YYYY_NNNN.pdf
 */
export function extractPdfUrls(html: string): string[] {
  const pattern = /\/fileadmin\/Dateien\/Website\/Dateien\/Amtsblatt\/[\w_]+\.pdf/gi;
  const matches = html.match(pattern) ?? [];
  // Deduplizieren und vollstaendige URLs bauen
  const unique = [...new Set(matches)];
  return unique.map((path) =>
    path.startsWith("http") ? path : `https://www.bad-saeckingen.de${path}`
  );
}

/**
 * Extrahiert Ausgabe-Nummer und Datum aus dem PDF-Dateinamen.
 * Pattern: 26_2025_0051.pdf → { prefix: "26", year: "2025", number: "0051" }
 */
export function parseAmtsblattFilename(url: string): {
  issueNumber: string;
  year: string;
} | null {
  const match = url.match(/(\d{2})_(\d{4})_(\d{4})\.pdf$/i);
  if (!match) return null;
  return {
    issueNumber: match[3],
    year: match[2],
  };
}

// --- Text-Extraktion ---

/**
 * Extrahiert Rohtext aus einem PDF-Buffer via unpdf (serverless-kompatibel).
 * Gibt den Text und die Seitenanzahl zurueck.
 */
export async function extractTextFromPdf(
  pdfBuffer: Buffer
): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const uint8 = new Uint8Array(pdfBuffer);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  const pages = pdf.numPages;
  return { text, pages };
}

// --- KI-Strukturierung ---

/** System-Prompt fuer Claude Haiku */
export const EXTRACTION_SYSTEM_PROMPT = `Du bist ein Extraktions-Assistent für das Amtsblatt "Trompeterblättle" der Stadt Bad Säckingen.

Extrahiere ALLE einzelnen Meldungen und Bekanntmachungen aus dem Text als JSON-Array.

Kategorien:
- "verwaltung" — Rathaus, Öffnungszeiten, Sprechstunden, Wahlen, Sitzungen
- "verkehr" — Straßensperrungen, Umleitungen, Parkplätze, Verkehrsänderungen
- "baustelle" — Bauarbeiten, Tiefbau, Sanierungen
- "veranstaltung" — Konzerte, Märkte, Feste, Theater, Führungen, Ausstellungen
- "verein" — Vereinsmeldungen, Sport, Musik, Ehrenamt, Feuerwehr
- "soziales" — Pflege, Beratung, Senioren, Jugend, Kirche, Sozialstationen
- "entsorgung" — Müllabfuhr, Wertstoff, Sperrmüll, Grünschnitt, Recycling
- "warnung" — Warnmeldungen, Gefahren, Notfälle
- "sonstiges" — Alles was nicht in die anderen Kategorien passt

Für jede Meldung erstelle ein JSON-Objekt:
{
  "title": "Kurzer prägnanter Titel (max 80 Zeichen)",
  "body": "Zusammenfassung in 1-3 Sätzen. Siezen. Wichtige Details (Datum, Ort, Uhrzeit) beibehalten.",
  "category": "eine der obigen Kategorien"
}

Regeln:
- Extrahiere JEDE einzelne Meldung, auch kleine Hinweise
- Ignoriere: Impressum, Seitenzahlen, Kopfzeilen, reine Werbeanzeigen, Todesanzeigen
- Fasse NICHT mehrere Meldungen zusammen — jede Meldung einzeln
- Antworte NUR mit dem JSON-Array, kein Markdown, keine Erklärungen
- Body darf maximal 480 Zeichen haben`;

/**
 * Bereitet den User-Prompt mit dem extrahierten Text vor.
 * Kuerzt auf max. ~100.000 Zeichen um Token-Limit einzuhalten.
 */
export function buildExtractionPrompt(rawText: string): string {
  const maxLen = 100_000;
  const text = rawText.length > maxLen ? rawText.slice(0, maxLen) : rawText;
  return `Hier ist der vollständige Text einer Ausgabe des Amtsblatts "Trompeterblättle" der Stadt Bad Säckingen. Extrahiere alle Meldungen:\n\n${text}`;
}

/**
 * Parst die KI-Antwort und validiert die extrahierten Meldungen.
 * Gibt nur gueltige Meldungen zurueck.
 */
export function parseExtractionResponse(
  responseText: string
): AmtsblattExtractedItem[] {
  // JSON aus der Antwort extrahieren (manchmal mit Markdown-Wrapper)
  let jsonStr = responseText.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: unknown[];
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`KI-Antwort ist kein gültiges JSON: ${jsonStr.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("KI-Antwort ist kein Array");
  }

  // Validierung und Bereinigung
  const items: AmtsblattExtractedItem[] = [];
  for (const raw of parsed) {
    if (typeof raw !== "object" || raw === null) continue;
    const obj = raw as Record<string, unknown>;

    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const body = typeof obj.body === "string" ? obj.body.trim() : "";
    const category = typeof obj.category === "string" ? obj.category.trim() : "sonstiges";

    if (!title || !body) continue;

    items.push({
      title: title.slice(0, 80),
      body: body.slice(0, 480),
      category: VALID_CATEGORIES.includes(category as AnnouncementCategory)
        ? (category as AnnouncementCategory)
        : "sonstiges",
    });
  }

  return items;
}
