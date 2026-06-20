import { describe, expect, it } from "vitest";
import { TAGESRAETSEL_FRAGEN } from "@/modules/spiele/data/tagesraetsel-fragen";

// Welle SP1-2: Integritaet der Founder-freigegebenen Tagesraetsel-Fragen.
// (Inhaltliche Faktenpruefung = Founder; hier nur strukturelle Invarianten.)

describe("TAGESRAETSEL_FRAGEN (SP1-2 Daten)", () => {
  it("enthaelt mindestens 40 Fragen", () => {
    expect(TAGESRAETSEL_FRAGEN.length).toBeGreaterThanOrEqual(40);
  });

  it("jede Frage hat genau 4 nicht-leere Optionen und einen gueltigen answer-Index", () => {
    for (const f of TAGESRAETSEL_FRAGEN) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.options).toHaveLength(4);
      for (const opt of f.options) {
        expect(opt.trim().length).toBeGreaterThan(0);
      }
      expect(Number.isInteger(f.answer)).toBe(true);
      expect(f.answer).toBeGreaterThanOrEqual(0);
      expect(f.answer).toBeLessThan(f.options.length);
    }
  });

  it("jede Frage hat eine failure-free Geschichte (nicht leer)", () => {
    for (const f of TAGESRAETSEL_FRAGEN) {
      expect(f.story.trim().length).toBeGreaterThan(0);
    }
  });

  it("hat keine doppelten Fragetexte", () => {
    const seen = new Set(TAGESRAETSEL_FRAGEN.map((f) => f.q));
    expect(seen.size).toBe(TAGESRAETSEL_FRAGEN.length);
  });

  it("markiert die lokalen Bad-Saeckingen-Fragen (mind. 10)", () => {
    const lokal = TAGESRAETSEL_FRAGEN.filter((f) => f.lokal === true);
    expect(lokal.length).toBeGreaterThanOrEqual(10);
  });
});
