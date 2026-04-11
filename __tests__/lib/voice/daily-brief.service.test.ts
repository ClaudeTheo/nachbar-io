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

    it("sagt explizit, dass Pollendaten fehlen, wenn pollen=null", () => {
      const brief = buildDailyBrief({ ...fullPayload, pollen: null });
      expect(brief).toContain("Zum Pollenflug habe ich gerade keine Daten");
      expect(brief).not.toContain("Birke");
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
});
