// modules/voice/services/daily-brief.service.ts
// Phase-1 Task G-5: Deterministischer Tagesueberblick fuer den Vorlesen-Button
// auf /hier-bei-mir.
//
// Baut aus Quartier-Info-Daten und externen Warnungen einen
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
  PollenData,
  WasteNext,
  LocalEvent,
} from "@/modules/info-hub/types";

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

function isQuartierWeather(value: unknown): value is QuartierWeather {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const weather = value as Partial<QuartierWeather>;
  return (
    (typeof weather.temp === "number" || weather.temp === null) &&
    typeof weather.description === "string"
  );
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

function isPollenData(value: unknown): value is PollenData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pollen = (value as Partial<PollenData>).pollen;
  if (!pollen || typeof pollen !== "object" || Array.isArray(pollen)) {
    return false;
  }
  return Object.values(pollen).every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      isPollenIntensity((entry as { today?: unknown }).today) &&
      isPollenIntensity((entry as { tomorrow?: unknown }).tomorrow),
  );
}

function isPollenIntensity(value: unknown): boolean {
  return (
    value === 0 ||
    value === 0.5 ||
    value === 1 ||
    value === 1.5 ||
    value === 2 ||
    value === 2.5 ||
    value === 3
  );
}

/**
 * Warnung aus der Banner-Quelle (/api/warnings/*, W6 A4:3).
 * Bewusst strukturell minimal, damit der Voice-Service nicht von der
 * Komponenten-Schicht importieren muss — ExternalWarningItem aus
 * components/warnings/use-external-warnings ist strukturell kompatibel.
 */
export interface SpokenWarning {
  headline: string;
  severity: "minor" | "moderate" | "severe" | "extreme" | "unknown";
}

// Die Banner-Quelle liefert Severity lowercase (inkl. "unknown");
// "unknown" wird nicht als Warnstufe vorgelesen.
const EXTERNAL_SEVERITY_DE: Record<SpokenWarning["severity"], string | null> = {
  extreme: "extrem",
  severe: "schwer",
  moderate: "mittel",
  minor: "gering",
  unknown: null,
};

function externalWarningSentence(warnings: SpokenWarning[] | null): string {
  if (warnings === null) {
    // Warnquelle (noch) nicht geladen — ehrlich sagen statt "keine Warnungen"
    // zu behaupten, waehrend der Banner gleich etwas anzeigen koennte.
    return "Zu Warnungen habe ich gerade keine Daten.";
  }
  if (warnings.length === 0) {
    return "Es liegen gerade keine Warnungen vor.";
  }
  const first = warnings[0];
  const level = EXTERNAL_SEVERITY_DE[first.severity];
  const levelPart = level ? ` Warnstufe ${level}.` : "";
  // Ohne Seitenverweis: der Brief laeuft auf /quartier-info UND /hier-bei-mir,
  // und der Warn-Banner steht ohnehin direkt auf derselben Seite.
  const remaining = warnings.length - 1;
  const suffix =
    remaining === 0
      ? ""
      : remaining === 1
        ? " Es gibt eine weitere Warnung."
        : ` Es gibt ${remaining} weitere Warnungen.`;
  return `Achtung: ${first.headline}.${levelPart}${suffix}`;
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
 * @param externalWarnings Warnungen aus der Banner-Quelle (W6, A4:3 —
 *        useExternalWarnings). `null` = Quelle noch nicht geladen/fehlgeschlagen;
 *        Array = vorlesen. Seiten, die den ExternalWarningBanner rendern,
 *        MUESSEN dieselben Warnungen hier uebergeben, damit Ohr und Auge
 *        uebereinstimmen.
 * @returns Ein zusammenhaengender Sprechtext. Niemals leer —
 *          bei komplett leeren Daten werden fuenf Fallback-Saetze geliefert.
 */
export function buildDailyBrief(
  data: Partial<QuartierInfoResponse>,
  externalWarnings: SpokenWarning[] | null,
): string {
  const weather = isQuartierWeather(data.weather) ? data.weather : null;
  const pollen = isPollenData(data.pollen) ? data.pollen : null;
  const wasteNext = Array.isArray(data.waste_next) ? data.waste_next : [];
  const events = Array.isArray(data.events) ? data.events : [];

  const parts = [
    weatherSentence(weather),
    pollenSentence(pollen),
    externalWarningSentence(externalWarnings ?? null),
    wasteSentence(wasteNext),
    eventSentence(events),
  ];
  return parts.join("\n\n");
}
