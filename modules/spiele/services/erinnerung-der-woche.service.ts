// Welle SP2-2 — „Erinnerung der Woche": reine, deterministische Wochen-Auswahl.
// Pro Kalenderwoche genau EIN Familienfoto, stabil die ganze Woche, danach
// rotiert es. Nur Fotos MIT Bildunterschrift (= die „Geschichte") und gueltiger
// Signed-URL kommen in Frage. Testbar (Datum wird injiziert, kein new Date()).

/**
 * Deterministischer, DST-immuner Wochen-Index (Montag-ausgerichtet).
 * Bewusst ueber `Date.UTC(year, month, date)` (reine Kalenderfelder) — damit
 * sich der Index ueber Sommer-/Winterzeit-Grenzen nicht verschiebt.
 * 1970-01-01 (Tag 0) war ein Donnerstag; `+3` legt die Wochengrenze auf Montag.
 */
export function weekIndex(date: Date): number {
  const absoluteDays = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return Math.floor((absoluteDays + 3) / 7);
}

export interface ErinnerungPhoto {
  caption: string | null;
  url: string | null;
}

/**
 * Waehlt das „Foto der Woche" deterministisch aus den captionierten Fotos.
 * Gleiche Woche -> gleiches Foto; Folgewoche -> rotiert. `null`, wenn kein Foto
 * eine Bildunterschrift mit gueltiger Signed-URL hat.
 */
export function getErinnerungDerWoche<T extends ErinnerungPhoto>(
  date: Date,
  photos: T[],
): T | null {
  const eligible = photos.filter(
    (p) => p.url && p.caption && p.caption.trim().length > 0,
  );
  if (eligible.length === 0) return null;
  return eligible[weekIndex(date) % eligible.length];
}
