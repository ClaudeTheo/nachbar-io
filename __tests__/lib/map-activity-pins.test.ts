import { describe, expect, it } from "vitest";

import {
  MAP_ACTIVITY_PIN_DEFINITIONS,
  MAP_ACTIVITY_PIN_TYPES,
  createMapActivityPinSvgMarkup,
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

  it("erzeugt Leaflet-taugliches SVG-Markup ohne Emoji-Fallback", () => {
    const markup = createMapActivityPinSvgMarkup("mowing", {
      size: 52,
      title: "Rasenhilfe am Rebberg",
    });

    expect(markup).toContain("<svg");
    expect(markup).toContain('data-activity-pin-type="mowing"');
    expect(markup).toContain('aria-label="Rasenhilfe am Rebberg"');
    expect(markup).toContain('width="52"');
    expect(markup).toContain('height="69"');
    expect(markup).toContain("drop-shadow");
    expect(markup).not.toContain("🌱");
    expect(markup).not.toContain("⚽");
  });

  it("ueberschreibt die Farbe aus dem fachlichen Zustand statt aus dem Symbol", () => {
    const markup = createMapActivityPinSvgMarkup("mowing", {
      colorState: "yellow",
      title: "Rasenhilfe dringend",
    });

    expect(markup).toContain('data-activity-pin-type="mowing"');
    expect(markup).toContain('data-activity-pin-color-state="yellow"');
    expect(markup).toContain('fill="#F0B21B"');
    expect(markup).not.toContain('fill="#83B54F"');
  });

  it("escaped nutzergesteuerte Titel im SVG-Markup", () => {
    const markup = createMapActivityPinSvgMarkup("meeting", {
      title: `Treff <script>alert("x")</script>`,
    });

    expect(markup).toContain(
      "Treff &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(markup).not.toContain("<script>");
  });
});
