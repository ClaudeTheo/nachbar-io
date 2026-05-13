import { describe, expect, it } from "vitest";

import {
  MAP_ACTIVITY_PIN_DEFINITIONS,
  MAP_ACTIVITY_PIN_TYPES,
  getMapActivityPinDefinition,
  isMapActivityPinType,
} from "@/lib/map-activity-pins";

describe("map activity pins", () => {
  it("definiert die ersten zehn freigegebenen Pin-Typen in stabiler Reihenfolge", () => {
    expect(MAP_ACTIVITY_PIN_TYPES).toEqual([
      "learning",
      "meeting",
      "sport",
      "mowing",
      "shopping",
      "tech",
      "gardening",
      "event",
      "companion",
      "warning",
    ]);
  });

  it("liefert fuer jeden Pin ein deutsches Label und eine Designfarbe", () => {
    for (const type of MAP_ACTIVITY_PIN_TYPES) {
      const definition = MAP_ACTIVITY_PIN_DEFINITIONS[type];

      expect(definition.type).toBe(type);
      expect(definition.label).toMatch(/\S/);
      expect(definition.description).toMatch(/\S/);
      expect(definition.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(definition.glowColor).toMatch(/^rgba\(/);
    }
  });

  it("erkennt gueltige Pin-Typen sicher", () => {
    expect(isMapActivityPinType("learning")).toBe(true);
    expect(isMapActivityPinType("warning")).toBe(true);
    expect(isMapActivityPinType("pflegegrad")).toBe(false);
    expect(isMapActivityPinType(null)).toBe(false);
  });

  it("gibt unbekannte Pin-Typen als Lern-Pin zurueck", () => {
    expect(getMapActivityPinDefinition("sport").label).toBe("Sport / Spiel");
    expect(getMapActivityPinDefinition("does-not-exist").type).toBe(
      "learning",
    );
  });
});
