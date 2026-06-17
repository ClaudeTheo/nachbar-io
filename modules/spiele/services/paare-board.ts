// Welle SP2-1 — „Paare finden": reine Board-Planung (testbar, ohne UI/Random).
// Das Raster skaliert nach Fotomenge; zu wenige Familienfotos -> Emoji-Fallback
// (das Spiel bleibt spielbar, auch wenn die Familie noch keine Fotos geladen hat).

/** Eine Karten-Sorte; im Spiel zweimal vorhanden (= ein Paar). */
export interface PaarItem {
  /** Match-Key: zwei Karten gehoeren zusammen, wenn ihre id gleich ist */
  id: string;
  /** Emoji-Variante (Fallback) */
  emoji?: string;
  /** Foto-Variante: kurzlebige Signed-URL aus /api/senior/photos (SB-3) */
  imageUrl?: string;
  /** Bildbeschreibung / Bildunterschrift (alt-Text) */
  alt?: string;
}

/** Emoji-Set des Fallback-Spiels (identisch zum bisherigen Kiosk-Spiel). */
export const PAARE_EMOJIS = ["🌻", "🏠", "☀️", "🐱", "🎵", "🍰", "⭐", "❤️"];

export function buildEmojiPaare(): PaarItem[] {
  return PAARE_EMOJIS.map((emoji) => ({ id: emoji, emoji }));
}

export interface BoardPlan {
  mode: "photos" | "emoji";
  /** Anzahl der Paare (Karten = pairs * 2) */
  pairs: number;
  /** Spalten im Raster */
  columns: number;
}

/**
 * Plant das Raster anhand der Menge nutzbarer Familienfotos:
 *   - >= 8 Fotos -> 8 Paare, 4 Spalten (4x4)
 *   - 6-7 Fotos  -> Paare = Fotomenge, 4 Spalten
 *   - 4-5 Fotos  -> Paare = Fotomenge, 3 Spalten (kleineres Raster)
 *   - < 4 Fotos  -> Emoji-Fallback (8 Paare, 4 Spalten)
 */
export function planPaareBoard(photoCount: number): BoardPlan {
  if (photoCount < 4) {
    return { mode: "emoji", pairs: PAARE_EMOJIS.length, columns: 4 };
  }
  const pairs = Math.min(photoCount, 8);
  const columns = pairs >= 6 ? 4 : 3;
  return { mode: "photos", pairs, columns };
}
