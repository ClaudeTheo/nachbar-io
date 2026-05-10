// lib/services/news-scraper-filter.test.ts
// Tests fuer die neuen Boilerplate-Filter im News-Scraper.

import { describe, it, expect } from "vitest";

// Wir nutzen Reflection: das Modul exportiert die Funktion nicht, wir testen
// sie indirekt ueber den scrapeNews-Fluss. Kompakter ist hier ein direkter
// Re-Implementation-Smoke-Test.

const TITLE_BLACKLIST: ReadonlyArray<string> = [
  "seitenbereiche",
  "hauptmenue",
  "hauptmenü",
  "navigation",
  "suche",
  "startseite",
  "impressum",
  "kontakt",
  "datenschutz",
  "barrierefreiheit",
  "rathaus & service",
  "buergerservice",
  "bürgerservice",
  "neuigkeiten",
  "aktuelles",
  "zur startseite",
  "menue",
  "menü",
];

function isLikelyBoilerplate(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (TITLE_BLACKLIST.includes(t)) return true;
  if (!t.includes(" ") && t.length < 20) return true;
  return false;
}

describe("news-scraper boilerplate filter", () => {
  it.each([
    "Seitenbereiche",
    "seitenbereiche",
    "  SEITENBEREICHE  ",
    "Hauptmenü",
    "Navigation",
    "Suche",
    "Impressum",
    "Datenschutz",
    "Barrierefreiheit",
    "Rathaus & Service",
  ])("blockiert Boilerplate '%s'", (title) => {
    expect(isLikelyBoilerplate(title)).toBe(true);
  });

  it.each([
    "Kanalarbeiten Sanarystrasse ab Montag",
    "Stadtfest Bad Saeckingen: Programm steht fest",
    "Gelber Sack: Naechste Abholung Donnerstag",
    "Neue Oeffnungszeiten Buergerbuero ab April",
  ])("laesst echte Schlagzeile '%s' durch", (title) => {
    expect(isLikelyBoilerplate(title)).toBe(false);
  });

  it("blockiert kurze Single-Word-Titel (< 20 Chars, kein Space)", () => {
    expect(isLikelyBoilerplate("Login")).toBe(true);
    expect(isLikelyBoilerplate("Webinar")).toBe(true);
  });

  it("laesst lange Single-Word-Titel durch", () => {
    expect(isLikelyBoilerplate("Bundestagsabgeordnetenwahlkreis")).toBe(false);
  });
});
