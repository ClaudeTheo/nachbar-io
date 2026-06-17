import { describe, expect, it } from "vitest";
import {
  getDailyQuestions,
  dayOfYear,
  dailyCacheKey,
} from "@/modules/spiele/services/tagesraetsel.service";

// Welle SP1-2: reine Tages-Rotations-Logik, extrahiert aus dem Kiosk-Quiz
// (app/(kiosk)/kiosk/games/quiz/page.tsx). Deterministisch pro Kalendertag,
// generisch ueber die Fragen-Form, injizierbares Datum (testbar).

const POOL = Array.from({ length: 10 }, (_, i) => ({ id: i }));

describe("getDailyQuestions (SP1-2)", () => {
  it("liefert deterministisch dieselbe Auswahl fuer denselben Tag", () => {
    const a = getDailyQuestions(new Date(2026, 5, 17), POOL, 5);
    const b = getDailyQuestions(new Date(2026, 5, 17, 23, 59), POOL, 5);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it("rotiert am Folgetag (andere Auswahl)", () => {
    const today = getDailyQuestions(new Date(2026, 5, 17), POOL, 5);
    const tomorrow = getDailyQuestions(new Date(2026, 5, 18), POOL, 5);
    expect(tomorrow).not.toEqual(today);
  });

  it("waehlt konsekutive Fragen per dayOfYear-Offset mit Wraparound", () => {
    // dayOfYear fuer 2026-01-01 = 1 -> offset 1 % 10 = 1 -> [1,2,3,4,5]
    const sel = getDailyQuestions(new Date(2026, 0, 1), POOL, 5);
    expect(sel.map((x) => x.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("ist generisch ueber die Fragen-Form", () => {
    const fragen = [
      { q: "A?", options: ["1", "2"], answer: 0, story: "..." },
      { q: "B?", options: ["1", "2"], answer: 1, story: "..." },
    ];
    const sel = getDailyQuestions(new Date(2026, 0, 1), fragen, 1);
    expect(sel).toHaveLength(1);
    expect(typeof sel[0].q).toBe("string");
  });

  it("klemmt count auf die Pool-Groesse (keine Duplikate bei kleinem Pool)", () => {
    const small = [{ id: 0 }, { id: 1 }, { id: 2 }];
    const sel = getDailyQuestions(new Date(2026, 0, 1), small, 5);
    expect(sel).toHaveLength(3);
    expect(new Set(sel.map((x) => x.id)).size).toBe(3);
  });

  it("liefert [] bei leerem Pool", () => {
    expect(getDailyQuestions(new Date(2026, 0, 1), [], 5)).toEqual([]);
  });
});

describe("dayOfYear (SP1-2)", () => {
  it("ist 1 am 1. Januar", () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
  });
  it("waechst mit dem Datum", () => {
    expect(dayOfYear(new Date(2026, 0, 2))).toBe(2);
  });
  it("ist DST-immun: korrekter Ordinaltag an den Sommer-/Winterzeit-Grenzen 2026", () => {
    // 2026 (kein Schaltjahr): Spring-Forward 29.03., Fall-Back 25.10.
    // Eine naive getTime()-ms-Differenz waere hier um 1 verschoben.
    expect(dayOfYear(new Date(2026, 2, 29))).toBe(88); // 31+28+29
    expect(dayOfYear(new Date(2026, 2, 30))).toBe(89);
    expect(dayOfYear(new Date(2026, 9, 25))).toBe(298); // bis Sep 273 + 25
  });
  it("ist tageszeit-unabhaengig (Mitternacht == 23:59 desselben Tages)", () => {
    expect(dayOfYear(new Date(2026, 2, 29, 0, 0))).toBe(
      dayOfYear(new Date(2026, 2, 29, 23, 59)),
    );
  });
});

describe("dailyCacheKey (SP1-2)", () => {
  it("liefert null-gepaddetes ISO-Format YYYY-MM-DD", () => {
    expect(dailyCacheKey(new Date(2026, 0, 10))).toBe("2026-01-10");
    expect(dailyCacheKey(new Date(2026, 9, 1))).toBe("2026-10-01");
  });
  it("ist pro Kalendertag stabil und wechselt am Folgetag", () => {
    expect(dailyCacheKey(new Date(2026, 5, 17, 0, 0))).toBe(
      dailyCacheKey(new Date(2026, 5, 17, 23, 59)),
    );
    expect(dailyCacheKey(new Date(2026, 5, 17))).not.toBe(
      dailyCacheKey(new Date(2026, 5, 18)),
    );
  });
});
