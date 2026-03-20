// __tests__/lib/municipal/amtsblatt.test.ts
// Tests fuer Amtsblatt-Integration: URL-Extraktion, Dateinamen-Parsing, KI-Response-Parsing

import { describe, it, expect } from "vitest";
import {
  extractPdfUrls,
  parseAmtsblattFilename,
  buildExtractionPrompt,
  parseExtractionResponse,
  AMTSBLATT_PAGE_URL,
  AMTSBLATT_PDF_BASE,
  EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/municipal/amtsblatt";

// ============================================================
// 1. KONSTANTEN
// ============================================================

describe("Amtsblatt — Konstanten", () => {
  it("AMTSBLATT_PAGE_URL zeigt auf bad-saeckingen.de", () => {
    expect(AMTSBLATT_PAGE_URL).toContain("bad-saeckingen.de");
    expect(AMTSBLATT_PAGE_URL).toContain("amtsblatt");
  });

  it("AMTSBLATT_PDF_BASE endet mit Slash", () => {
    expect(AMTSBLATT_PDF_BASE).toMatch(/\/$/);
  });

  it("EXTRACTION_SYSTEM_PROMPT enthaelt alle Kategorien", () => {
    const categories = [
      "verwaltung", "verkehr", "baustelle", "veranstaltung",
      "verein", "soziales", "entsorgung", "warnung", "sonstiges",
    ];
    for (const cat of categories) {
      expect(EXTRACTION_SYSTEM_PROMPT).toContain(`"${cat}"`);
    }
  });

  it("EXTRACTION_SYSTEM_PROMPT fordert JSON-Array", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("JSON-Array");
  });
});

// ============================================================
// 2. PDF-URL-EXTRAKTION
// ============================================================

describe("Amtsblatt — extractPdfUrls", () => {
  it("extrahiert PDF-URLs aus HTML", () => {
    const html = `
      <a href="/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.pdf">Ausgabe 06</a>
      <a href="/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0045.pdf">Ausgabe 05</a>
    `;
    const urls = extractPdfUrls(html);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe("https://www.bad-saeckingen.de/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.pdf");
    expect(urls[1]).toBe("https://www.bad-saeckingen.de/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0045.pdf");
  });

  it("dedupliziert gleiche URLs", () => {
    const html = `
      <a href="/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.pdf">Link 1</a>
      <a href="/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.pdf">Link 2</a>
    `;
    const urls = extractPdfUrls(html);
    expect(urls).toHaveLength(1);
  });

  it("gibt leeres Array bei keinen PDFs zurueck", () => {
    const html = "<div>Keine PDFs hier</div>";
    expect(extractPdfUrls(html)).toHaveLength(0);
  });

  it("ignoriert andere PDF-Pfade", () => {
    const html = `
      <a href="/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.pdf">Amtsblatt</a>
      <a href="/fileadmin/andere/datei.pdf">Anderes PDF</a>
    `;
    const urls = extractPdfUrls(html);
    expect(urls).toHaveLength(1);
  });

  it("matched case-insensitive", () => {
    const html = `<a href="/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.PDF">Test</a>`;
    const urls = extractPdfUrls(html);
    expect(urls).toHaveLength(1);
  });
});

// ============================================================
// 3. DATEINAMEN-PARSING
// ============================================================

describe("Amtsblatt — parseAmtsblattFilename", () => {
  it("parst Standard-Dateinamen", () => {
    const result = parseAmtsblattFilename(
      "https://www.bad-saeckingen.de/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0051.pdf"
    );
    expect(result).toEqual({ issueNumber: "0051", year: "2025" });
  });

  it("parst andere Ausgabe-Nummern", () => {
    const result = parseAmtsblattFilename(
      "https://www.bad-saeckingen.de/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2025_0045.pdf"
    );
    expect(result).toEqual({ issueNumber: "0045", year: "2025" });
  });

  it("gibt null bei unbekanntem Format zurueck", () => {
    expect(parseAmtsblattFilename("https://example.com/random.pdf")).toBeNull();
    expect(parseAmtsblattFilename("https://example.com/")).toBeNull();
  });

  it("parst relativen Pfad", () => {
    const result = parseAmtsblattFilename("/fileadmin/Dateien/Website/Dateien/Amtsblatt/26_2026_0001.pdf");
    expect(result).toEqual({ issueNumber: "0001", year: "2026" });
  });
});

// ============================================================
// 4. EXTRACTION-PROMPT
// ============================================================

describe("Amtsblatt — buildExtractionPrompt", () => {
  it("baut Prompt mit Text", () => {
    const prompt = buildExtractionPrompt("Rathaus geschlossen am 24.12.");
    expect(prompt).toContain("Trompeterblättle");
    expect(prompt).toContain("Rathaus geschlossen am 24.12.");
  });

  it("kuerzt sehr langen Text auf 100.000 Zeichen", () => {
    const longText = "A".repeat(200_000);
    const prompt = buildExtractionPrompt(longText);
    // Prompt = Header + Text, also etwas mehr als 100.000
    expect(prompt.length).toBeLessThan(101_000);
  });

  it("laesst kurzen Text unverkuerzt", () => {
    const shortText = "Kurzer Text";
    const prompt = buildExtractionPrompt(shortText);
    expect(prompt).toContain("Kurzer Text");
  });
});

// ============================================================
// 5. KI-RESPONSE-PARSING
// ============================================================

describe("Amtsblatt — parseExtractionResponse", () => {
  it("parst valides JSON-Array", () => {
    const response = JSON.stringify([
      { title: "Rathaus geschlossen", body: "Am 24.12. bleibt das Rathaus geschlossen.", category: "verwaltung" },
      { title: "Baustelle Rheinbrückstr.", body: "Die Arbeiten dauern bis Ende März.", category: "baustelle" },
    ]);
    const items = parseExtractionResponse(response);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Rathaus geschlossen");
    expect(items[0].category).toBe("verwaltung");
    expect(items[1].category).toBe("baustelle");
  });

  it("entfernt Markdown-Wrapper", () => {
    const response = '```json\n[{"title":"Test","body":"Body","category":"sonstiges"}]\n```';
    const items = parseExtractionResponse(response);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test");
  });

  it("kuerzt zu lange Titel auf 80 Zeichen", () => {
    const longTitle = "A".repeat(120);
    const response = JSON.stringify([{ title: longTitle, body: "Body", category: "sonstiges" }]);
    const items = parseExtractionResponse(response);
    expect(items[0].title).toHaveLength(80);
  });

  it("kuerzt zu langen Body auf 480 Zeichen", () => {
    const longBody = "B".repeat(600);
    const response = JSON.stringify([{ title: "Titel", body: longBody, category: "sonstiges" }]);
    const items = parseExtractionResponse(response);
    expect(items[0].body).toHaveLength(480);
  });

  it("mappt unbekannte Kategorie auf sonstiges", () => {
    const response = JSON.stringify([{ title: "Test", body: "Body", category: "unbekannt" }]);
    const items = parseExtractionResponse(response);
    expect(items[0].category).toBe("sonstiges");
  });

  it("filtert Eintraege ohne Titel", () => {
    const response = JSON.stringify([
      { title: "", body: "Kein Titel", category: "sonstiges" },
      { title: "Hat Titel", body: "OK", category: "verwaltung" },
    ]);
    const items = parseExtractionResponse(response);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Hat Titel");
  });

  it("filtert Eintraege ohne Body", () => {
    const response = JSON.stringify([
      { title: "Nur Titel", body: "", category: "sonstiges" },
    ]);
    const items = parseExtractionResponse(response);
    expect(items).toHaveLength(0);
  });

  it("wirft Fehler bei ungueltigem JSON", () => {
    expect(() => parseExtractionResponse("kein json")).toThrow("kein gültiges JSON");
  });

  it("wirft Fehler wenn Antwort kein Array ist", () => {
    expect(() => parseExtractionResponse('{"key":"value"}')).toThrow("kein Array");
  });

  it("ignoriert nicht-Objekt-Eintraege im Array", () => {
    const response = JSON.stringify([
      "string",
      42,
      null,
      { title: "Valide", body: "OK", category: "sonstiges" },
    ]);
    const items = parseExtractionResponse(response);
    expect(items).toHaveLength(1);
  });

  it("akzeptiert alle 9 Kategorien", () => {
    const categories = [
      "verkehr", "baustelle", "veranstaltung", "verwaltung",
      "warnung", "sonstiges", "verein", "soziales", "entsorgung",
    ];
    for (const cat of categories) {
      const response = JSON.stringify([{ title: "Test", body: "Body", category: cat }]);
      const items = parseExtractionResponse(response);
      expect(items[0].category).toBe(cat);
    }
  });
});

// ============================================================
// 6. EDGE CASES
// ============================================================

describe("Amtsblatt — Edge Cases", () => {
  it("extractPdfUrls mit leerem String", () => {
    expect(extractPdfUrls("")).toHaveLength(0);
  });

  it("parseExtractionResponse mit leerem Array", () => {
    expect(parseExtractionResponse("[]")).toHaveLength(0);
  });

  it("buildExtractionPrompt mit leerem Text", () => {
    const prompt = buildExtractionPrompt("");
    expect(prompt).toContain("Trompeterblättle");
  });
});
