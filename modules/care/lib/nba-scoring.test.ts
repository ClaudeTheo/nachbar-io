// modules/care/lib/nba-scoring.test.ts
// Tests fuer die NBA Scoring-Engine (Neues Begutachtungsassessment)

import { describe, it, expect } from "vitest";
import {
  calculateModuleWeighted,
  calculateTotalWeighted,
  estimatePflegegrad,
  getModuleLabel,
  getModuleMaxRaw,
  getModuleShortLabel,
  getModuleMaxWeighted,
  getDetailedWeightedScores,
  type ModuleScores,
} from "./nba-scoring";

describe("NBA Scoring Engine", () => {
  // --- calculateModuleWeighted ---

  describe("calculateModuleWeighted", () => {
    describe("Modul 1 (Mobilität)", () => {
      it("gibt 0 fuer Rohwert 0", () => {
        expect(calculateModuleWeighted(1, 0)).toBe(0);
      });
      it("gibt 2.5 fuer Rohwert 1", () => {
        expect(calculateModuleWeighted(1, 1)).toBe(2.5);
      });
      it("gibt 5 fuer Rohwert 2", () => {
        expect(calculateModuleWeighted(1, 2)).toBe(5);
      });
      it("gibt 5 fuer Rohwert 3", () => {
        expect(calculateModuleWeighted(1, 3)).toBe(5);
      });
      it("gibt 7.5 fuer Rohwert 4", () => {
        expect(calculateModuleWeighted(1, 4)).toBe(7.5);
      });
      it("gibt 7.5 fuer Rohwert 5", () => {
        expect(calculateModuleWeighted(1, 5)).toBe(7.5);
      });
      it("gibt 10 fuer Rohwert 6", () => {
        expect(calculateModuleWeighted(1, 6)).toBe(10);
      });
      it("gibt 10 fuer Rohwert 10 (Maximum)", () => {
        expect(calculateModuleWeighted(1, 10)).toBe(10);
      });
    });

    describe("Modul 2 (Kognitiv)", () => {
      it("gibt 0 fuer Rohwert 0", () => {
        expect(calculateModuleWeighted(2, 0)).toBe(0);
      });
      it("gibt 3.75 fuer Rohwert 1", () => {
        expect(calculateModuleWeighted(2, 1)).toBe(3.75);
      });
      it("gibt 3.75 fuer Rohwert 2", () => {
        expect(calculateModuleWeighted(2, 2)).toBe(3.75);
      });
      it("gibt 7.5 fuer Rohwert 3", () => {
        expect(calculateModuleWeighted(2, 3)).toBe(7.5);
      });
      it("gibt 11.25 fuer Rohwert 8", () => {
        expect(calculateModuleWeighted(2, 8)).toBe(11.25);
      });
      it("gibt 15 fuer Rohwert 16", () => {
        expect(calculateModuleWeighted(2, 16)).toBe(15);
      });
      it("gibt 15 fuer Rohwert 33 (Maximum)", () => {
        expect(calculateModuleWeighted(2, 33)).toBe(15);
      });
    });

    describe("Modul 3 (Verhalten)", () => {
      it("gibt 0 fuer Rohwert 0", () => {
        expect(calculateModuleWeighted(3, 0)).toBe(0);
      });
      it("gibt 3.75 fuer Rohwert 1", () => {
        expect(calculateModuleWeighted(3, 1)).toBe(3.75);
      });
      it("gibt 7.5 fuer Rohwert 3", () => {
        expect(calculateModuleWeighted(3, 3)).toBe(7.5);
      });
      it("gibt 11.25 fuer Rohwert 5", () => {
        expect(calculateModuleWeighted(3, 5)).toBe(11.25);
      });
      it("gibt 15 fuer Rohwert 7", () => {
        expect(calculateModuleWeighted(3, 7)).toBe(15);
      });
      it("gibt 15 fuer Rohwert 65 (Maximum)", () => {
        expect(calculateModuleWeighted(3, 65)).toBe(15);
      });
    });

    describe("Modul 4 (Selbstversorgung)", () => {
      it("gibt 0 fuer Rohwert 0", () => {
        expect(calculateModuleWeighted(4, 0)).toBe(0);
      });
      it("gibt 10 fuer Rohwert 1", () => {
        expect(calculateModuleWeighted(4, 1)).toBe(10);
      });
      it("gibt 20 fuer Rohwert 5", () => {
        expect(calculateModuleWeighted(4, 5)).toBe(20);
      });
      it("gibt 30 fuer Rohwert 10", () => {
        expect(calculateModuleWeighted(4, 10)).toBe(30);
      });
      it("gibt 40 fuer Rohwert 19", () => {
        expect(calculateModuleWeighted(4, 19)).toBe(40);
      });
      it("gibt 40 fuer Rohwert 40 (Maximum)", () => {
        expect(calculateModuleWeighted(4, 40)).toBe(40);
      });
    });

    describe("Modul 5 (Krankheit)", () => {
      it("gibt 0 fuer Rohwert 0", () => {
        expect(calculateModuleWeighted(5, 0)).toBe(0);
      });
      it("gibt 5 fuer Rohwert 1", () => {
        expect(calculateModuleWeighted(5, 1)).toBe(5);
      });
      it("gibt 10 fuer Rohwert 2", () => {
        expect(calculateModuleWeighted(5, 2)).toBe(10);
      });
      it("gibt 15 fuer Rohwert 4", () => {
        expect(calculateModuleWeighted(5, 4)).toBe(15);
      });
      it("gibt 20 fuer Rohwert 6", () => {
        expect(calculateModuleWeighted(5, 6)).toBe(20);
      });
      it("gibt 20 fuer Rohwert 50 (Maximum)", () => {
        expect(calculateModuleWeighted(5, 50)).toBe(20);
      });
    });

    describe("Modul 6 (Alltag)", () => {
      it("gibt 0 fuer Rohwert 0", () => {
        expect(calculateModuleWeighted(6, 0)).toBe(0);
      });
      it("gibt 3.75 fuer Rohwert 1", () => {
        expect(calculateModuleWeighted(6, 1)).toBe(3.75);
      });
      it("gibt 7.5 fuer Rohwert 2", () => {
        expect(calculateModuleWeighted(6, 2)).toBe(7.5);
      });
      it("gibt 11.25 fuer Rohwert 4", () => {
        expect(calculateModuleWeighted(6, 4)).toBe(11.25);
      });
      it("gibt 15 fuer Rohwert 6", () => {
        expect(calculateModuleWeighted(6, 6)).toBe(15);
      });
      it("gibt 15 fuer Rohwert 15 (Maximum)", () => {
        expect(calculateModuleWeighted(6, 15)).toBe(15);
      });
    });

    describe("Clamp-Verhalten", () => {
      it("begrenzt negative Werte auf 0", () => {
        expect(calculateModuleWeighted(1, -5)).toBe(0);
      });
      it("begrenzt Werte ueber Maximum auf Maximum", () => {
        expect(calculateModuleWeighted(1, 99)).toBe(10);
      });
    });
  });

  // --- calculateTotalWeighted ---

  describe("calculateTotalWeighted", () => {
    it("gibt 0 fuer alle Nullen → PG 0", () => {
      const scores: ModuleScores = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 };
      const total = calculateTotalWeighted(scores);
      expect(total).toBe(0);
      expect(estimatePflegegrad(total)).toBe(0);
    });

    it("gibt 100 fuer alle Maximalwerte → PG 5", () => {
      const scores: ModuleScores = { m1: 10, m2: 33, m3: 65, m4: 40, m5: 50, m6: 15 };
      const total = calculateTotalWeighted(scores);
      // M1=10, MAX(M2=15,M3=15)=15, M4=40, M5=20, M6=15 = 100
      expect(total).toBe(100);
      expect(estimatePflegegrad(total)).toBe(5);
    });

    it("wendet MAX-Regel an: M2 hoeher als M3", () => {
      const scores: ModuleScores = { m1: 0, m2: 16, m3: 0, m4: 0, m5: 0, m6: 0 };
      // M2 gewichtet = 15, M3 gewichtet = 0, MAX = 15
      const total = calculateTotalWeighted(scores);
      expect(total).toBe(15);
    });

    it("wendet MAX-Regel an: M3 hoeher als M2", () => {
      const scores: ModuleScores = { m1: 0, m2: 0, m3: 7, m4: 0, m5: 0, m6: 0 };
      // M2 gewichtet = 0, M3 gewichtet = 15, MAX = 15
      const total = calculateTotalWeighted(scores);
      expect(total).toBe(15);
    });

    it("MAX-Regel: bei Gleichstand zaehlt der gleiche Wert", () => {
      const scores: ModuleScores = { m1: 0, m2: 3, m3: 3, m4: 0, m5: 0, m6: 0 };
      // M2 gewichtet = 7.5, M3 gewichtet = 7.5, MAX = 7.5
      const total = calculateTotalWeighted(scores);
      expect(total).toBe(7.5);
    });

    it("berechnet mittleren Fall → PG 3", () => {
      // Typischer Fall: eingeschraenkte Mobilitaet, mittlere Selbstversorgung
      const scores: ModuleScores = { m1: 5, m2: 3, m3: 2, m4: 12, m5: 3, m6: 4 };
      // M1=7.5, MAX(M2=7.5, M3=3.75)=7.5, M4=30, M5=10, M6=11.25
      const total = calculateTotalWeighted(scores);
      expect(total).toBe(7.5 + 7.5 + 30 + 10 + 11.25); // = 66.25
      expect(estimatePflegegrad(total)).toBe(3);
    });
  });

  // --- estimatePflegegrad ---

  describe("estimatePflegegrad", () => {
    it("gibt PG 0 fuer Wert unter 12.5", () => {
      expect(estimatePflegegrad(0)).toBe(0);
      expect(estimatePflegegrad(12.4)).toBe(0);
    });

    it("gibt PG 1 fuer Grenzwert 12.5", () => {
      expect(estimatePflegegrad(12.5)).toBe(1);
    });

    it("gibt PG 1 fuer 26.9", () => {
      expect(estimatePflegegrad(26.9)).toBe(1);
    });

    it("gibt PG 2 fuer Grenzwert 27", () => {
      expect(estimatePflegegrad(27)).toBe(2);
    });

    it("gibt PG 2 fuer 47.4", () => {
      expect(estimatePflegegrad(47.4)).toBe(2);
    });

    it("gibt PG 3 fuer Grenzwert 47.5", () => {
      expect(estimatePflegegrad(47.5)).toBe(3);
    });

    it("gibt PG 3 fuer 69.9", () => {
      expect(estimatePflegegrad(69.9)).toBe(3);
    });

    it("gibt PG 4 fuer Grenzwert 70", () => {
      expect(estimatePflegegrad(70)).toBe(4);
    });

    it("gibt PG 4 fuer 89.9", () => {
      expect(estimatePflegegrad(89.9)).toBe(4);
    });

    it("gibt PG 5 fuer Grenzwert 90", () => {
      expect(estimatePflegegrad(90)).toBe(5);
    });

    it("gibt PG 5 fuer 100", () => {
      expect(estimatePflegegrad(100)).toBe(5);
    });
  });

  // --- Hilfsfunktionen ---

  describe("getModuleLabel", () => {
    it("gibt deutsche Bezeichnung fuer alle Module", () => {
      expect(getModuleLabel(1)).toBe("Mobilität");
      expect(getModuleLabel(2)).toBe("Kognitive und kommunikative Fähigkeiten");
      expect(getModuleLabel(3)).toBe("Verhaltensweisen und psychische Problemlagen");
      expect(getModuleLabel(4)).toBe("Selbstversorgung");
      expect(getModuleLabel(5)).toBe("Umgang mit krankheitsbedingten Anforderungen");
      expect(getModuleLabel(6)).toBe("Gestaltung des Alltagslebens");
    });
  });

  describe("getModuleShortLabel", () => {
    it("gibt Kurzbezeichnungen fuer Charts", () => {
      expect(getModuleShortLabel(1)).toBe("Mobilität");
      expect(getModuleShortLabel(4)).toBe("Selbstversorgung");
    });
  });

  describe("getModuleMaxRaw", () => {
    it("gibt korrekte Maximalwerte fuer alle Module", () => {
      expect(getModuleMaxRaw(1)).toBe(10);
      expect(getModuleMaxRaw(2)).toBe(33);
      expect(getModuleMaxRaw(3)).toBe(65);
      expect(getModuleMaxRaw(4)).toBe(40);
      expect(getModuleMaxRaw(5)).toBe(50);
      expect(getModuleMaxRaw(6)).toBe(15);
    });
  });

  describe("getModuleMaxWeighted", () => {
    it("gibt korrekte maximale Gewichtungswerte", () => {
      expect(getModuleMaxWeighted(1)).toBe(10);
      expect(getModuleMaxWeighted(2)).toBe(15);
      expect(getModuleMaxWeighted(3)).toBe(15);
      expect(getModuleMaxWeighted(4)).toBe(40);
      expect(getModuleMaxWeighted(5)).toBe(20);
      expect(getModuleMaxWeighted(6)).toBe(15);
    });
  });

  describe("getDetailedWeightedScores", () => {
    it("liefert detaillierte Aufschluesselung mit MAX-Info", () => {
      const scores: ModuleScores = { m1: 5, m2: 10, m3: 3, m4: 15, m5: 4, m6: 5 };
      const result = getDetailedWeightedScores(scores);

      expect(result.modules.m1.weighted).toBe(7.5);
      expect(result.modules.m2.weighted).toBe(11.25);
      expect(result.modules.m3.weighted).toBe(7.5);
      expect(result.modules.m2.countsInTotal).toBe(true);
      expect(result.modules.m3.countsInTotal).toBe(false);
      expect(result.modules.m4.weighted).toBe(30);
      expect(result.modules.m5.weighted).toBe(15);
      expect(result.modules.m6.weighted).toBe(11.25);
      // Total: 7.5 + 11.25 + 30 + 15 + 11.25 = 75
      expect(result.total).toBe(75);
      expect(result.pflegegrad).toBe(4);
    });

    it("M3 zaehlt wenn hoeher als M2", () => {
      const scores: ModuleScores = { m1: 0, m2: 1, m3: 10, m4: 0, m5: 0, m6: 0 };
      const result = getDetailedWeightedScores(scores);
      expect(result.modules.m2.countsInTotal).toBe(false);
      expect(result.modules.m3.countsInTotal).toBe(true);
    });
  });
});
