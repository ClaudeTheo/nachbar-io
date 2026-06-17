import { describe, it, expect } from "vitest";
import {
  planPaareBoard,
  buildEmojiPaare,
} from "@/modules/spiele/services/paare-board";

// Welle SP2-1: Das Raster skaliert nach Fotomenge. Genug Familienfotos -> grosses
// Raster mit Fotos; zu wenige -> Emoji-Fallback (wie das Kiosk-Spiel bisher).

describe("planPaareBoard (SP2-1)", () => {
  it("ab 8 Fotos: 8 Paare, 4 Spalten (4x4)", () => {
    expect(planPaareBoard(8)).toEqual({ mode: "photos", pairs: 8, columns: 4 });
    expect(planPaareBoard(12)).toEqual({ mode: "photos", pairs: 8, columns: 4 });
  });

  it("6-7 Fotos: 4 Spalten, Paare = Fotomenge", () => {
    expect(planPaareBoard(6)).toEqual({ mode: "photos", pairs: 6, columns: 4 });
    expect(planPaareBoard(7)).toEqual({ mode: "photos", pairs: 7, columns: 4 });
  });

  it("4-5 Fotos: kleineres Raster (3 Spalten)", () => {
    expect(planPaareBoard(4)).toEqual({ mode: "photos", pairs: 4, columns: 3 });
    expect(planPaareBoard(5)).toEqual({ mode: "photos", pairs: 5, columns: 3 });
  });

  it("unter 4 Fotos: Emoji-Fallback (8 Paare)", () => {
    expect(planPaareBoard(3).mode).toBe("emoji");
    expect(planPaareBoard(0)).toEqual({ mode: "emoji", pairs: 8, columns: 4 });
  });
});

describe("buildEmojiPaare", () => {
  it("liefert 8 eindeutige Emoji-Items", () => {
    const paare = buildEmojiPaare();
    expect(paare).toHaveLength(8);
    expect(new Set(paare.map((p) => p.id)).size).toBe(8);
    expect(paare.every((p) => typeof p.emoji === "string")).toBe(true);
  });
});
