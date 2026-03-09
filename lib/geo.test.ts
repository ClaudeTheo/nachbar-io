// Nachbar.io — Tests fuer Geo-Hilfsfunktionen
import { describe, it, expect } from "vitest";
import { haversineDistance, RADIUS_DIRECT } from "./geo";

describe("haversineDistance", () => {
  it("gibt 0 fuer identische Punkte zurueck", () => {
    const distance = haversineDistance(47.5535, 7.964, 47.5535, 7.964);
    expect(distance).toBe(0);
  });

  it("berechnet bekannte Distanz Bad Saeckingen → Basel (~30km)", () => {
    // Bad Saeckingen: 47.5535, 7.964
    // Basel: 47.5596, 7.5886
    const distance = haversineDistance(47.5535, 7.964, 47.5596, 7.5886);
    // Erwartung: ca. 28-32 km
    expect(distance).toBeGreaterThan(25000);
    expect(distance).toBeLessThan(35000);
  });

  it("berechnet kurze Distanz innerhalb des Quartiers (~100m)", () => {
    // Zwei Punkte im Quartier (Purkersdorfer Str. → Sanarystr.)
    const distance = haversineDistance(47.5617, 7.9483, 47.5625, 7.9490);
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(200);
  });

  it("ist symmetrisch (A→B == B→A)", () => {
    const ab = haversineDistance(47.5535, 7.964, 47.5596, 7.5886);
    const ba = haversineDistance(47.5596, 7.5886, 47.5535, 7.964);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it("berechnet Antipoden-Distanz (~20.000km)", () => {
    // Nordpol → Suedpol
    const distance = haversineDistance(90, 0, -90, 0);
    // Halber Erdumfang: ~20.015 km
    expect(distance).toBeGreaterThan(19_000_000);
    expect(distance).toBeLessThan(21_000_000);
  });

  it("funktioniert mit negativen Koordinaten", () => {
    // Buenos Aires: -34.6037, -58.3816
    // Tokio: 35.6762, 139.6503
    const distance = haversineDistance(-34.6037, -58.3816, 35.6762, 139.6503);
    expect(distance).toBeGreaterThan(18_000_000);
  });
});

describe("RADIUS_DIRECT", () => {
  it("ist als 50 Meter definiert", () => {
    expect(RADIUS_DIRECT).toBe(50);
  });
});
