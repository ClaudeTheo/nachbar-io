// __tests__/lib/voice/daily-brief.service.test.ts
// Phase-1 Task G-5: Unit-Tests fuer den deterministischen Tagesueberblick.

import { describe, it, expect } from "vitest";
import { buildDailyBrief } from "@/modules/voice/services/daily-brief.service";
import type {
  QuartierInfoResponse,
  QuartierWeather,
  NinaWarning,
  PollenData,
  WasteNext,
  LocalEvent,
} from "@/modules/info-hub/types";

// --- Fixtures ---

const fullWeather: QuartierWeather = {
  temp: 18,
  icon: "sun",
  description: "sonnig",
  forecast: [],
};

const fullWarning: NinaWarning = {
  id: "w1",
  warning_id: "w1",
  severity: "Severe",
  headline: "Gewitter im Anmarsch",
  description: null,
  sent_at: "2026-04-11T10:00:00Z",
  expires_at: null,
};

const fullWaste: WasteNext = {
  date: "2026-04-14",
  type: "restmuell",
  label: "Restmüll",
};

const fullEvent: LocalEvent = {
  title: "Wochenmarkt",
  description: "Frische Ware",
  schedule: "Mi und Sa, 08 bis 12 Uhr",
  location: "Rathausplatz",
  icon: "calendar",
};

const fullPollen: PollenData = {
  region: "Oberrhein",
  pollen: {
    Birke: { today: 2.5, tomorrow: 2 },
    Graeser: { today: 1, tomorrow: 1 },
    Erle: { today: 0, tomorrow: 0 },
  },
};

const fullPayload: Partial<QuartierInfoResponse> = {
  weather: fullWeather,
  nina: [fullWarning],
  pollen: fullPollen,
  waste_next: [fullWaste],
  events: [fullEvent],
};

describe("buildDailyBrief", () => {
  describe("mit vollstaendigen Daten", () => {
    it("enthaelt Wetter mit Temperatur und Beschreibung", () => {
      const brief = buildDailyBrief(fullPayload);
      expect(brief).toContain("sonnig");
      expect(brief).toContain("18 Grad");
    });

    it("enthaelt NINA-Warnung mit Headline und Warnstufe", () => {
      const brief = buildDailyBrief(fullPayload);
      expect(brief).toContain("Achtung");
      expect(brief).toContain("Gewitter im Anmarsch");
      expect(brief).toContain("schwer");
    });

    it("enthaelt Muellabfuhr-Datum im deutschen Langformat", () => {
      const brief = buildDailyBrief(fullPayload);
      expect(brief).toContain("Restmüll");
      // formatWasteDate rendert "Dienstag, 14. April" fuer 2026-04-14
      expect(brief).toMatch(/14\. April/);
    });

    it("enthaelt Veranstaltung mit Titel und Zeit", () => {
      const brief = buildDailyBrief(fullPayload);
      expect(brief).toContain("Wochenmarkt");
      expect(brief).toContain("Mi und Sa, 08 bis 12 Uhr");
      expect(brief).toContain("Rathausplatz");
    });

    it("trennt die fuenf Abschnitte mit doppeltem Zeilenumbruch", () => {
      const brief = buildDailyBrief(fullPayload);
      // Vier Trennstellen zwischen fuenf Saetzen
      // (Wetter, Pollen, Warnungen, Muell, Veranstaltung)
      const separators = brief.split("\n\n").length - 1;
      expect(separators).toBe(4);
    });

    it("nennt bei Pollenflug den staerksten Allergen mit Stufe", () => {
      const brief = buildDailyBrief(fullPayload);
      // Birke hat today=2.5 -> Stufe "hoch"
      expect(brief).toContain("Birke");
      expect(brief).toContain("hoch");
    });

    it("ist deterministisch — zwei Aufrufe liefern denselben Text", () => {
      const a = buildDailyBrief(fullPayload);
      const b = buildDailyBrief(fullPayload);
      expect(a).toBe(b);
    });
  });

  describe("Fallback-Verhalten bei fehlenden Quellen", () => {
    it("sagt explizit, dass Wetterdaten fehlen, wenn weather=null", () => {
      const brief = buildDailyBrief({ ...fullPayload, weather: null });
      expect(brief).toContain("Zum Wetter habe ich gerade keine Daten");
      // Und halluziniert KEINE Temperatur
      expect(brief).not.toMatch(/\d+ Grad/);
    });

    it("sagt explizit, dass Wetterdaten fehlen, wenn temp=null", () => {
      const brief = buildDailyBrief({
        ...fullPayload,
        weather: { ...fullWeather, temp: null },
      });
      expect(brief).toContain("Zum Wetter habe ich gerade keine Daten");
    });

    it("behandelt falsch geformte Wetter- und Pollendaten wie fehlende Quellen", () => {
      const malformedPayload = {
        ...fullPayload,
        weather: { description: "kaputt" },
        pollen: { pollen: ["Birke"] },
      } as unknown as Partial<QuartierInfoResponse>;

      const brief = buildDailyBrief(malformedPayload);

      expect(brief).toContain("Zum Wetter habe ich gerade keine Daten");
      expect(brief).toContain("Zum Pollenflug habe ich gerade keine Daten");
      expect(brief).not.toContain("undefined Grad");
      expect(brief).not.toContain("kaputt bei");
      expect(brief).not.toContain("kaum Pollenflug");
    });

    it("sagt 'keine Warnungen' bei leerem NINA-Array", () => {
      const brief = buildDailyBrief({ ...fullPayload, nina: [] });
      expect(brief).toContain("Es liegen gerade keine Warnungen vor");
      expect(brief).not.toContain("Achtung");
    });

    it("erwaehnt die Anzahl zusaetzlicher Warnungen, wenn >1", () => {
      const secondWarning: NinaWarning = {
        ...fullWarning,
        id: "w2",
        warning_id: "w2",
        headline: "Hochwasser",
      };
      const brief = buildDailyBrief({
        ...fullPayload,
        nina: [fullWarning, secondWarning],
      });
      // Erste Warnung im Text, Hinweis auf 1 weitere Warnung
      expect(brief).toContain("Gewitter im Anmarsch");
      expect(brief).toContain("1 weitere Warnung");
    });

    it("sagt explizit, dass Muelldaten fehlen, wenn waste_next leer", () => {
      const brief = buildDailyBrief({ ...fullPayload, waste_next: [] });
      expect(brief).toContain("Zur Muellabfuhr habe ich gerade keine Daten");
    });

    it("sagt explizit, dass Event-Daten fehlen, wenn events leer", () => {
      const brief = buildDailyBrief({ ...fullPayload, events: [] });
      expect(brief).toContain("Zu Veranstaltungen habe ich gerade keine Daten");
    });

    it("behandelt Nicht-Array-Werte fuer Warnungen, Muell und Events wie fehlende Quellen", () => {
      const malformedPayload = {
        ...fullPayload,
        nina: { headline: "Kaputte Warnliste" },
        waste_next: { label: "Kaputter Muellwert" },
        events: { title: "Kaputter Terminwert" },
      } as unknown as Partial<QuartierInfoResponse>;

      const brief = buildDailyBrief(malformedPayload);

      expect(brief).toContain("Es liegen gerade keine Warnungen vor");
      expect(brief).toContain("Zur Muellabfuhr habe ich gerade keine Daten");
      expect(brief).toContain("Zu Veranstaltungen habe ich gerade keine Daten");
      expect(brief).not.toContain("Kaputte Warnliste");
      expect(brief).not.toContain("Kaputter Muellwert");
      expect(brief).not.toContain("Kaputter Terminwert");
    });

    it("sagt explizit, dass Pollendaten fehlen, wenn pollen=null", () => {
      const brief = buildDailyBrief({ ...fullPayload, pollen: null });
      expect(brief).toContain("Zum Pollenflug habe ich gerade keine Daten");
      expect(brief).not.toContain("Birke");
    });

    it("behandelt Pollendaten mit ungueltigen Intensitaeten wie fehlende Quellen", () => {
      const malformedPayload = {
        ...fullPayload,
        pollen: {
          region: "Oberrhein",
          pollen: {
            Birke: { today: 4, tomorrow: 1 },
            Graeser: { today: 1.25, tomorrow: 1.5 },
          },
        },
      } as unknown as Partial<QuartierInfoResponse>;

      const brief = buildDailyBrief(malformedPayload);

      expect(brief).toContain("Zum Pollenflug habe ich gerade keine Daten");
      expect(brief).not.toContain("Birke");
      expect(brief).not.toContain("hoch");
    });

    it("meldet 'kaum Pollenflug' wenn alle Intensitaeten 0 sind", () => {
      const zeroPollen: PollenData = {
        region: "Oberrhein",
        pollen: {
          Birke: { today: 0, tomorrow: 0 },
          Graeser: { today: 0, tomorrow: 0 },
        },
      };
      const brief = buildDailyBrief({ ...fullPayload, pollen: zeroPollen });
      expect(brief).toContain("kaum Pollenflug");
    });

    it("meldet 'nur gering' wenn max Intensitaet 0.5 oder 1 ist", () => {
      const lowPollen: PollenData = {
        region: "Oberrhein",
        pollen: {
          Birke: { today: 1, tomorrow: 1 },
          Graeser: { today: 0.5, tomorrow: 0.5 },
        },
      };
      const brief = buildDailyBrief({ ...fullPayload, pollen: lowPollen });
      expect(brief).toContain("nur gering");
      // Kein Einzel-Allergen-Name, weil unter Schwelle
      expect(brief).not.toMatch(/Birke.*Stufe/);
    });

    it("nennt 'mittel' statt 'hoch' bei Intensitaet 1.5-2", () => {
      const midPollen: PollenData = {
        region: "Oberrhein",
        pollen: {
          Graeser: { today: 2, tomorrow: 2 },
        },
      };
      const brief = buildDailyBrief({ ...fullPayload, pollen: midPollen });
      expect(brief).toContain("Graeser");
      expect(brief).toContain("mittel");
      expect(brief).not.toContain("hoch");
    });
  });

  describe("komplett leere Eingabe", () => {
    it("liefert fuenf Fallback-Saetze, nie einen leeren String", () => {
      const brief = buildDailyBrief({});
      expect(brief).toContain("Zum Wetter habe ich gerade keine Daten");
      expect(brief).toContain("Zum Pollenflug habe ich gerade keine Daten");
      expect(brief).toContain("Es liegen gerade keine Warnungen vor");
      expect(brief).toContain("Zur Muellabfuhr habe ich gerade keine Daten");
      expect(brief).toContain("Zu Veranstaltungen habe ich gerade keine Daten");
      expect(brief.length).toBeGreaterThan(0);
    });

    it("halluziniert keine Fakten bei leerer Eingabe", () => {
      const brief = buildDailyBrief({});
      // Keine Zahlen fuer Temperatur, keine Datum-Nennung
      expect(brief).not.toMatch(/\d+ Grad/);
      expect(brief).not.toMatch(/Restmüll|Biomüll|Papier/);
    });
  });

  // W6 (A4:3): Der Brief spricht aus derselben Warnquelle wie der sichtbare
  // ExternalWarningBanner (/api/warnings/*), nicht mehr aus der toten
  // data.nina-Pipeline — Ohr und Auge duerfen sich nicht widersprechen.
  describe("externe Warnquelle (W6, A4:3 — Ohr = Auge mit dem Warn-Banner)", () => {
    const bannerWarning = {
      headline: "Sturmboeen im Landkreis",
      severity: "severe" as const,
    };

    it("nutzt die uebergebenen Banner-Warnungen statt data.nina", () => {
      const brief = buildDailyBrief({ ...fullPayload, nina: [] }, [bannerWarning]);
      expect(brief).toContain("Achtung: Sturmboeen im Landkreis.");
      expect(brief).toContain("Warnstufe schwer");
      expect(brief).not.toContain("Es liegen gerade keine Warnungen vor");
    });

    it("ignoriert data.nina, wenn die Banner-Quelle leer ist", () => {
      const brief = buildDailyBrief(fullPayload, []);
      expect(brief).toContain("Es liegen gerade keine Warnungen vor");
      expect(brief).not.toContain("Gewitter im Anmarsch");
    });

    it("sagt bei noch nicht geladener Warnquelle (null) ehrlich 'keine Daten' statt 'keine Warnungen'", () => {
      const brief = buildDailyBrief(fullPayload, null);
      expect(brief).toContain("Zu Warnungen habe ich gerade keine Daten");
      expect(brief).not.toContain("Es liegen gerade keine Warnungen vor");
      expect(brief).not.toContain("Achtung");
    });

    it("mappt die lowercase-Warnstufen der Banner-Quelle auf deutsche Stufen", () => {
      expect(
        buildDailyBrief({}, [{ headline: "A", severity: "extreme" }]),
      ).toContain("Warnstufe extrem");
      expect(
        buildDailyBrief({}, [{ headline: "A", severity: "moderate" }]),
      ).toContain("Warnstufe mittel");
      expect(
        buildDailyBrief({}, [{ headline: "A", severity: "minor" }]),
      ).toContain("Warnstufe gering");
    });

    it("laesst die Warnstufe bei severity=unknown weg, statt Unsinn vorzulesen", () => {
      const brief = buildDailyBrief({}, [
        { headline: "Stoerung im Mobilfunknetz", severity: "unknown" },
      ]);
      expect(brief).toContain("Achtung: Stoerung im Mobilfunknetz.");
      expect(brief).not.toContain("Warnstufe");
    });

    it("erwaehnt zusaetzliche Banner-Warnungen wie beim Legacy-Pfad", () => {
      const brief = buildDailyBrief({}, [
        bannerWarning,
        { headline: "Hochwasser", severity: "moderate" as const },
      ]);
      expect(brief).toContain("Sturmboeen im Landkreis");
      expect(brief).toContain("1 weitere Warnung");
    });

    it("ohne zweiten Parameter bleibt der Legacy-Pfad (data.nina) unveraendert", () => {
      const brief = buildDailyBrief(fullPayload);
      expect(brief).toContain("Gewitter im Anmarsch");
      expect(brief).toContain("schwer");
    });
  });
});
