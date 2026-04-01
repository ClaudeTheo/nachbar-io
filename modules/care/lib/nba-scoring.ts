// modules/care/lib/nba-scoring.ts
// NBA (Neues Begutachtungsassessment) Scoring-Engine
// Berechnet gewichtete Punktzahlen und schaetzt den Pflegegrad
// KEIN Medizinprodukt — nur zur Orientierung

// --- Typen ---

export interface ModuleScores {
  m1: number; // Mobilitaet (max 10)
  m2: number; // Kognitive + kommunikative Faehigkeiten (max 33)
  m3: number; // Verhaltensweisen + psychische Problemlagen (max 65)
  m4: number; // Selbstversorgung (max 40)
  m5: number; // Umgang mit krankheitsbedingten Anforderungen (max 50)
  m6: number; // Gestaltung des Alltagslebens (max 15)
}

export type ModuleNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type Pflegegrad = 0 | 1 | 2 | 3 | 4 | 5;

// --- Konversionstabellen (Rohwert → gewichteter Wert) ---

const MODULE_CONVERSION_TABLES: Record<ModuleNumber, [number, number][]> = {
  // Modul 1: Mobilitaet (Gewicht: 10%)
  1: [
    [0, 0],
    [1, 2.5],
    [3, 5],    // 2-3 → 5
    [5, 7.5],  // 4-5 → 7.5
    [10, 10],  // 6-10 → 10
  ],
  // Modul 2: Kognitive Faehigkeiten (Gewicht: 15%, MAX-Regel mit M3)
  2: [
    [0, 0],
    [2, 3.75],   // 1-2 → 3.75
    [7, 7.5],    // 3-7 → 7.5
    [15, 11.25], // 8-15 → 11.25
    [33, 15],    // 16-33 → 15
  ],
  // Modul 3: Verhaltensweisen (Gewicht: 15%, MAX-Regel mit M2)
  3: [
    [0, 0],
    [2, 3.75],   // 1-2 → 3.75
    [4, 7.5],    // 3-4 → 7.5
    [6, 11.25],  // 5-6 → 11.25
    [65, 15],    // 7-65 → 15
  ],
  // Modul 4: Selbstversorgung (Gewicht: 40%)
  4: [
    [0, 0],
    [2, 10],   // 1-2 → 10
    [7, 20],   // 3-7 → 20
    [18, 30],  // 8-18 → 30
    [40, 40],  // 19-40 → 40
  ],
  // Modul 5: Krankheitsbedingte Anforderungen (Gewicht: 20%)
  5: [
    [0, 0],
    [1, 5],    // 1 → 5
    [3, 10],   // 2-3 → 10
    [5, 15],   // 4-5 → 15
    [50, 20],  // 6+ → 20
  ],
  // Modul 6: Alltagsleben (Gewicht: 15%)
  6: [
    [0, 0],
    [1, 3.75],  // 1 → 3.75
    [3, 7.5],   // 2-3 → 7.5
    [5, 11.25], // 4-5 → 11.25
    [15, 15],   // 6-15 → 15
  ],
};

// Maximale Rohwerte pro Modul
const MODULE_MAX_RAW: Record<ModuleNumber, number> = {
  1: 10,
  2: 33,
  3: 65,
  4: 40,
  5: 50,
  6: 15,
};

// Deutsche Modulbezeichnungen
const MODULE_LABELS: Record<ModuleNumber, string> = {
  1: "Mobilität",
  2: "Kognitive und kommunikative Fähigkeiten",
  3: "Verhaltensweisen und psychische Problemlagen",
  4: "Selbstversorgung",
  5: "Umgang mit krankheitsbedingten Anforderungen",
  6: "Gestaltung des Alltagslebens",
};

// Kurzbezeichnungen fuer Charts
const MODULE_SHORT_LABELS: Record<ModuleNumber, string> = {
  1: "Mobilität",
  2: "Kognitiv",
  3: "Verhalten",
  4: "Selbstversorgung",
  5: "Krankheit",
  6: "Alltag",
};

// Maximale gewichtete Werte pro Modul
const MODULE_MAX_WEIGHTED: Record<ModuleNumber, number> = {
  1: 10,
  2: 15,
  3: 15,
  4: 40,
  5: 20,
  6: 15,
};

// --- Funktionen ---

/**
 * Berechnet den gewichteten Wert eines Moduls basierend auf dem Rohwert.
 * Verwendet die offiziellen NBA-Konversionstabellen.
 */
export function calculateModuleWeighted(module: ModuleNumber, rawScore: number): number {
  const table = MODULE_CONVERSION_TABLES[module];
  const maxRaw = MODULE_MAX_RAW[module];

  // Clamp auf gueltigen Bereich
  const clamped = Math.max(0, Math.min(rawScore, maxRaw));

  if (clamped === 0) return 0;

  // Finde den passenden Bereich in der Konversionstabelle
  // Die Tabelle ist aufsteigend sortiert: [maxRawForBand, weightedValue]
  for (let i = table.length - 1; i >= 0; i--) {
    const [upperBound] = table[i];
    // Sonderfall: Erster Eintrag nach 0 hat spezifische Untergrenzen
    if (i === 0) continue;

    const prevUpperBound = table[i - 1][0];
    if (clamped > prevUpperBound) {
      return table[i][1];
    }
  }

  return 0;
}

/**
 * Berechnet die gewichtete Gesamtpunktzahl.
 * Wendet die MAX-Regel fuer Module 2 und 3 an:
 * Nur der hoehere gewichtete Wert von M2/M3 zaehlt.
 * Formel: M1(10%) + MAX(M2,M3)(15%) + M4(40%) + M5(20%) + M6(15%) = max 100
 */
export function calculateTotalWeighted(scores: ModuleScores): number {
  const w1 = calculateModuleWeighted(1, scores.m1);
  const w2 = calculateModuleWeighted(2, scores.m2);
  const w3 = calculateModuleWeighted(3, scores.m3);
  const w4 = calculateModuleWeighted(4, scores.m4);
  const w5 = calculateModuleWeighted(5, scores.m5);
  const w6 = calculateModuleWeighted(6, scores.m6);

  // MAX-Regel: Nur der hoehere Wert von M2 und M3 zaehlt
  const maxM2M3 = Math.max(w2, w3);

  return w1 + maxM2M3 + w4 + w5 + w6;
}

/**
 * Schaetzt den Pflegegrad basierend auf der gewichteten Gesamtpunktzahl.
 */
export function estimatePflegegrad(totalWeighted: number): Pflegegrad {
  if (totalWeighted >= 90) return 5;
  if (totalWeighted >= 70) return 4;
  if (totalWeighted >= 47.5) return 3;
  if (totalWeighted >= 27) return 2;
  if (totalWeighted >= 12.5) return 1;
  return 0;
}

/**
 * Gibt die deutsche Bezeichnung des Moduls zurueck.
 */
export function getModuleLabel(module: ModuleNumber): string {
  return MODULE_LABELS[module];
}

/**
 * Gibt die Kurzbezeichnung des Moduls zurueck (fuer Charts).
 */
export function getModuleShortLabel(module: ModuleNumber): string {
  return MODULE_SHORT_LABELS[module];
}

/**
 * Gibt den maximalen Rohwert eines Moduls zurueck.
 */
export function getModuleMaxRaw(module: ModuleNumber): number {
  return MODULE_MAX_RAW[module];
}

/**
 * Gibt den maximalen gewichteten Wert eines Moduls zurueck.
 */
export function getModuleMaxWeighted(module: ModuleNumber): number {
  return MODULE_MAX_WEIGHTED[module];
}

/**
 * Gibt alle gewichteten Einzelwerte zurueck (inkl. MAX-Info).
 */
export function getDetailedWeightedScores(scores: ModuleScores) {
  const w1 = calculateModuleWeighted(1, scores.m1);
  const w2 = calculateModuleWeighted(2, scores.m2);
  const w3 = calculateModuleWeighted(3, scores.m3);
  const w4 = calculateModuleWeighted(4, scores.m4);
  const w5 = calculateModuleWeighted(5, scores.m5);
  const w6 = calculateModuleWeighted(6, scores.m6);
  const maxM2M3 = Math.max(w2, w3);
  const total = w1 + maxM2M3 + w4 + w5 + w6;

  return {
    modules: {
      m1: { raw: scores.m1, weighted: w1, maxWeighted: 10 },
      m2: { raw: scores.m2, weighted: w2, maxWeighted: 15, countsInTotal: w2 >= w3 },
      m3: { raw: scores.m3, weighted: w3, maxWeighted: 15, countsInTotal: w3 > w2 },
      m4: { raw: scores.m4, weighted: w4, maxWeighted: 40 },
      m5: { raw: scores.m5, weighted: w5, maxWeighted: 20 },
      m6: { raw: scores.m6, weighted: w6, maxWeighted: 15 },
    },
    total,
    pflegegrad: estimatePflegegrad(total),
  };
}
