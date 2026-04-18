// TTS-Text fuer /was-steht-uns-zu.
// Harte Obergrenze: 400 Woerter (Layer-1-Cache-Guardrail).
// Strategie: Erst Versuch mit shortDescription; wenn zu lang, Text kuerzen
// durch Weglassen des Betrags. Wenn immer noch zu lang, wird hart abgeschnitten.

import type { Country, Leistung } from "./types";

export const MAX_TTS_WORDS = 400;

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const ORDINALS = [
  "Erstens",
  "Zweitens",
  "Drittens",
  "Viertens",
  "Fuenftens",
  "Sechstens",
  "Siebtens",
  "Achtens",
  "Neuntens",
  "Zehntens",
];

function joinParagraphs(parts: string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function buildCore(country: Country, leistungen: readonly Leistung[]): string {
  const verbindlich =
    country === "DE"
      ? "Ihre Pflegekasse"
      : "Ihre Ausgleichskasse oder IV-Stelle";
  const intro = `Was steht uns zu. Keine Rechtsberatung. Verbindlich sind ${verbindlich} und der Gesetzestext.`;

  const body = leistungen.map((l, i) => {
    const ord = ORDINALS[i] ?? `${i + 1}.`;
    const parts = [`${ord}: ${l.title}.`, l.shortDescription];
    if (l.amount) parts.push(`Betrag: ${l.amount}.`);
    return parts.join(" ");
  });

  return joinParagraphs([intro, ...body]);
}

function buildMinimal(
  country: Country,
  leistungen: readonly Leistung[],
): string {
  const verbindlich =
    country === "DE" ? "Ihre Pflegekasse" : "Ihre Ausgleichskasse";
  const intro = `Was steht uns zu. Keine Rechtsberatung. Verbindlich ist ${verbindlich}.`;
  const body = leistungen.map((l, i) => {
    const ord = ORDINALS[i] ?? `${i + 1}.`;
    return `${ord}: ${l.title}. ${l.shortDescription}`;
  });
  return joinParagraphs([intro, ...body]);
}

export function buildLeistungenTts(
  country: Country,
  leistungen: readonly Leistung[],
): string {
  const full = buildCore(country, leistungen);
  if (countWords(full) <= MAX_TTS_WORDS) return full;

  const minimal = buildMinimal(country, leistungen);
  if (countWords(minimal) <= MAX_TTS_WORDS) return minimal;

  // Letzter Ausweg: hart abschneiden an Wortgrenze.
  return minimal.split(/\s+/).slice(0, MAX_TTS_WORDS).join(" ");
}
