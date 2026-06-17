// Welle SP1-2 — Tagesraetsel-Logik (pure, getestet, injizierbar).
// Extrahiert die Tages-Rotation aus dem Kiosk-Quiz
// (app/(kiosk)/kiosk/games/quiz/page.tsx), damit Kiosk-Quiz und das spaetere
// Senior-Tagesraetsel EINE Quelle teilen (DRY). Kein React, kein Storage,
// kein Supabase — reine Funktionen mit injizierbarem Datum (testbar).

export interface TagesraetselFrage {
  q: string;
  /** Antwort-Optionen */
  options: string[];
  /** Index der besten Antwort */
  answer: number;
  /** failure-free: wird nach JEDER Antwort gezeigt (keine Fehler-Beschaemung) */
  story: string;
  /** Bad-Saeckingen-/Hochrhein-Bezug */
  lokal?: boolean;
}

/**
 * Tag des Jahres (1..366) fuer den Kalendertag eines Datums.
 * Bewusst ueber `Date.UTC(year, month, date)` (reine Kalenderfelder, keine
 * Uhrzeit) berechnet — so ist das Ergebnis DST-immun und haengt nur vom
 * Kalendertag ab. Eine naive `getTime()`-Differenz waere ueber die Sommer-/
 * Winterzeit-Grenze um einen Tag verschoben (Mitternacht vs. 23:59 desselben
 * Tages koennten unterschiedliche Werte liefern).
 */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / (1000 * 60 * 60 * 24));
}

/**
 * Deterministische Tages-Auswahl: `count` konsekutive Fragen aus dem Pool,
 * rotiert per dayOfYear-Offset (mit Wraparound). Gleicher Kalendertag ->
 * gleiche Auswahl, Folgetag rotiert. Generisch ueber die Fragen-Form, damit
 * sowohl das Kiosk-`Question` als auch `TagesraetselFrage` passen.
 * `count` wird auf die Pool-Groesse geklemmt (keine Duplikate bei kleinem Pool).
 */
export function getDailyQuestions<T>(date: Date, fragen: T[], count = 5): T[] {
  if (fragen.length === 0) return [];
  const n = Math.min(count, fragen.length);
  const offset = dayOfYear(date) % fragen.length;
  const selected: T[] = [];
  for (let i = 0; i < n; i++) {
    selected.push(fragen[(offset + i) % fragen.length]);
  }
  return selected;
}

/**
 * Stabiler, null-gepaddeter Tages-Cache-Key im ISO-Format `YYYY-MM-DD`.
 * Loest den frueheren Kiosk-Key `${y}-${getMonth()}-${getDate()}` ab: der war
 * dank der Bindestrich-Trennung zwar kollisionsfrei, aber 0-indiziert und
 * ungepaddet. Diese Variante ist nur klarer/konsistenter — kein Verhaltens-Fix,
 * der Key wird ohnehin nur mit sich selbst verglichen (Tageswechsel-Erkennung).
 */
export function dailyCacheKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
