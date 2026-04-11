// modules/voice/services/daily-brief.service.ts
// Phase-1 Task G-5: Deterministischer Tagesueberblick fuer den Vorlesen-Button
// auf /hier-bei-mir.
//
// Baut aus den Quartier-Info-Daten (Wetter, NINA, Muell, Events) einen
// zusammenhaengenden, senior-freundlichen Sprechtext. Rein Template-basiert
// — KEIN LLM, KEINE Halluzinationen. Bei fehlenden Quellen wird explizit
// gesagt "Dazu habe ich gerade keine Daten", nicht geraten.
//
// Regeln (Design-Doc 2026-04-10, Tonalitaet aus CLAUDE.md):
//  - Siezen, ruhig, sachlich.
//  - Ein kompletter Absatz pro Thema, getrennt durch doppelten Zeilenumbruch
//    (TTS erkennt das als Pause).
//  - Deterministisch: gleiche Eingabe -> gleiche Ausgabe, unabhaengig von
//    Uhrzeit, ausser dem Datum in der Muellabfuhr-Formulierung.
//  - Kein "Guten Morgen/Abend", weil das zeitabhaengig waere und den
//    Determinismus im Test brechen wuerde.

import type {
  QuartierInfoResponse,
  QuartierWeather,
  NinaWarning,
  NinaSeverity,
  PollenData,
  WasteNext,
  LocalEvent,
} from "@/modules/info-hub/types";

/**
 * Feste Uebersetzungstabelle fuer NINA-Severity-Stufen.
 * Die NINA-API liefert die Labels auf Englisch, wir lesen auf Deutsch vor.
 */
const SEVERITY_DE: Record<NinaSeverity, string> = {
  Extreme: "extrem",
  Severe: "schwer",
  Moderate: "mittel",
  Minor: "gering",
};

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) als deutschen Langsatz:
 * "Montag, 14. April".
 * Kein Jahr, weil das bei der Muellabfuhr nie relevant ist und den
 * Text unnoetig belastet.
 */
function formatWasteDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function weatherSentence(weather: QuartierWeather | null): string {
  if (!weather || weather.temp === null) {
    return "Zum Wetter habe ich gerade keine Daten.";
  }
  return `Heute ist es ${weather.description} bei ${weather.temp} Grad.`;
}

/**
 * Baut den Pollenflug-Satz aus den DWD-Daten.
 *
 * Regeln:
 *  - Keine Daten -> expliziter Fallback-Satz.
 *  - Alle Intensitaeten 0 -> "Heute kaum Pollenflug" (positiv, keine Panik).
 *  - Mindestens ein Eintrag >= 1.5 (mittel/hoch) -> den staerksten
 *    Eintrag nennen, damit Allergiker eine klare Ansage bekommen.
 *  - Werte zwischen 0.5 und 1 (gering) -> "Leichter Pollenflug"
 *    ohne Einzel-Nennung, um den Brief nicht zu ueberladen.
 *
 * Bei Gleichstand wird der erste Eintrag in Record-Iteration-Reihenfolge
 * gewaehlt — JavaScript-Objects behalten Insertion-Order, die API-Antwort
 * ist stabil sortiert, also bleibt das deterministisch.
 */
function pollenSentence(pollen: PollenData | null | undefined): string {
  if (!pollen || Object.keys(pollen.pollen).length === 0) {
    return "Zum Pollenflug habe ich gerade keine Daten.";
  }

  let maxName: string | null = null;
  let maxIntensity = 0;
  for (const [name, entry] of Object.entries(pollen.pollen)) {
    if (entry.today > maxIntensity) {
      maxIntensity = entry.today;
      maxName = name;
    }
  }

  if (maxIntensity === 0) {
    return "Heute ist kaum Pollenflug.";
  }
  if (maxIntensity < 1.5) {
    return "Heute ist der Pollenflug nur gering.";
  }
  const level = maxIntensity >= 2.5 ? "hoch" : "mittel";
  return `Beim Pollenflug ist ${maxName} heute auf Stufe ${level}.`;
}

function warningSentence(nina: NinaWarning[] | null | undefined): string {
  if (!nina || nina.length === 0) {
    return "Es liegen gerade keine Warnungen vor.";
  }
  // Nur die erste Warnung vorlesen, damit der Brief kompakt bleibt.
  // Falls mehrere Warnungen existieren, wird das am Ende angehaengt.
  const first = nina[0];
  const level = SEVERITY_DE[first.severity];
  const suffix =
    nina.length > 1
      ? ` Es gibt ${nina.length - 1} weitere Warnungen auf der Hier-bei-mir-Seite.`
      : "";
  return `Achtung: ${first.headline}. Warnstufe ${level}.${suffix}`;
}

function wasteSentence(waste: WasteNext[] | null | undefined): string {
  if (!waste || waste.length === 0) {
    return "Zur Muellabfuhr habe ich gerade keine Daten.";
  }
  const next = waste[0];
  const when = formatWasteDate(next.date);
  return `Die naechste Muellabfuhr ist am ${when}: ${next.label}.`;
}

function eventSentence(events: LocalEvent[] | null | undefined): string {
  if (!events || events.length === 0) {
    return "Zu Veranstaltungen habe ich gerade keine Daten.";
  }
  const first = events[0];
  return `Als Veranstaltung merken Sie sich: ${first.title}. ${first.schedule}, ${first.location}.`;
}

/**
 * Baut den vollstaendigen Tagesueberblick-Text zum Vorlesen zusammen.
 *
 * Reihenfolge: Wetter -> Pollenflug -> Warnungen -> Muell -> Veranstaltungen.
 * Trennung durch doppelten Zeilenumbruch fuer TTS-Pausen.
 *
 * @param data Die Rohdaten aus `/api/quartier-info`. Darf Partial-leer sein.
 * @returns Ein zusammenhaengender Sprechtext. Niemals leer —
 *          bei komplett leeren Daten werden fuenf Fallback-Saetze geliefert.
 */
export function buildDailyBrief(data: Partial<QuartierInfoResponse>): string {
  const parts = [
    weatherSentence(data.weather ?? null),
    pollenSentence(data.pollen),
    warningSentence(data.nina),
    wasteSentence(data.waste_next),
    eventSentence(data.events),
  ];
  return parts.join("\n\n");
}
