// __tests__/lib/security/risk-scorer.test.ts
// Unit-Tests fuer Security Risk-Scorer: decayedValue, Score-Berechnung

import { describe, it, expect } from "vitest";
import { decayedValue } from "@/lib/security/risk-scorer";

describe("decayedValue", () => {
  it("gibt vollen Wert bei age=0 zurueck", () => {
    expect(decayedValue(100, 0, 30 * 60 * 1000)).toBe(100);
  });

  it("halbiert bei genau einer Halbwertszeit", () => {
    const halfLife = 30 * 60 * 1000; // 30 min
    const result = decayedValue(100, halfLife, halfLife);
    expect(result).toBeCloseTo(50, 5);
  });

  it("viertelt bei zwei Halbwertszeiten", () => {
    const halfLife = 15 * 60 * 1000; // 15 min
    const result = decayedValue(100, 2 * halfLife, halfLife);
    expect(result).toBeCloseTo(25, 5);
  });

  it("gibt nahe 0 bei sehr alten Events", () => {
    const halfLife = 30 * 60 * 1000;
    const result = decayedValue(100, 10 * halfLife, halfLife); // 10 Halbwertszeiten
    expect(result).toBeLessThan(0.1);
  });

  it("skaliert linear mit Punktzahl", () => {
    const halfLife = 30 * 60 * 1000;
    const age = 15 * 60 * 1000;
    const result10 = decayedValue(10, age, halfLife);
    const result50 = decayedValue(50, age, halfLife);
    expect(result50 / result10).toBeCloseTo(5, 5);
  });

  it("gibt 0 bei 0 Punkten zurueck", () => {
    expect(decayedValue(0, 1000, 30 * 60 * 1000)).toBe(0);
  });

  it("akzeptiert verschiedene Halbwertszeiten (auth vs bot)", () => {
    const authHalfLife = 15 * 60 * 1000; // 15 min
    const botHalfLife = 30 * 60 * 1000; // 30 min
    const age = 15 * 60 * 1000;

    const authDecay = decayedValue(100, age, authHalfLife);
    const botDecay = decayedValue(100, age, botHalfLife);

    // Auth zerfaellt schneller → Wert kleiner
    expect(authDecay).toBeLessThan(botDecay);
    expect(authDecay).toBeCloseTo(50, 5); // genau 1 Halbwertszeit
    expect(botDecay).toBeCloseTo(70.71, 1); // halbe Halbwertszeit
  });
});
