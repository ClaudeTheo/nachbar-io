import { describe, expect, it } from "vitest";

import {
  LOCAL_ACTIVITY_PIN_PREVIEW_CENTER,
  LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS,
  LOCAL_ACTIVITY_PIN_PREVIEW_PINS,
  LOCAL_ACTIVITY_PIN_PREVIEW_TILE_URL,
} from "@/lib/map-activity-preview";

describe("map activity preview data", () => {
  it("stellt zehn anonyme Beispiel-Pins fuer Bad Saeckingen bereit", () => {
    expect(LOCAL_ACTIVITY_PIN_PREVIEW_CENTER).toEqual([47.5617, 7.9475]);
    expect(LOCAL_ACTIVITY_PIN_PREVIEW_TILE_URL).toContain(
      "basemaps.cartocdn.com",
    );
    expect(LOCAL_ACTIVITY_PIN_PREVIEW_PINS.map((pin) => pin.type)).toEqual([
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

  it("setzt die Vorschau-Pins auf anonymisierte Haus-Anker", () => {
    expect(LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS).toHaveLength(10);
    expect(LOCAL_ACTIVITY_PIN_PREVIEW_PINS).toHaveLength(
      LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS.length,
    );

    LOCAL_ACTIVITY_PIN_PREVIEW_PINS.forEach((pin, index) => {
      const anchor = LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS[index];

      expect(pin.lat).toBe(anchor.lat);
      expect(pin.lng).toBe(anchor.lng);
      expect(pin).not.toHaveProperty("approximate", true);
    });
  });

  it("verwendet keine echten Privatadressen oder Nutzer-Namen", () => {
    const serialized = JSON.stringify({
      anchors: LOCAL_ACTIVITY_PIN_PREVIEW_HOUSE_ANCHORS,
      pins: LOCAL_ACTIVITY_PIN_PREVIEW_PINS,
    });

    expect(serialized).not.toMatch(/Purkersdorfer|Sanary|Oberer Rebberg/i);
    expect(serialized).not.toMatch(/Thomas|Theobald/i);
    expect(
      LOCAL_ACTIVITY_PIN_PREVIEW_PINS.every(
        (pin) =>
          Math.abs(pin.lat - LOCAL_ACTIVITY_PIN_PREVIEW_CENTER[0]) < 0.01 &&
          Math.abs(pin.lng - LOCAL_ACTIVITY_PIN_PREVIEW_CENTER[1]) < 0.01,
      ),
    ).toBe(true);
  });

  it("nutzt auch in der Vorschau die automatische Farb- und Ortlogik", () => {
    const byId = new Map(
      LOCAL_ACTIVITY_PIN_PREVIEW_PINS.map((pin) => [pin.id, pin]),
    );

    expect(byId.get("preview-sport")).toMatchObject({
      colorState: "green",
      locationScope: "meeting_point",
      urgency: "normal",
    });
    expect(byId.get("preview-shopping")).toMatchObject({
      colorState: "yellow",
      locationScope: "home",
      urgency: "urgent",
    });
    expect(byId.get("preview-warning")).toMatchObject({
      colorState: "red",
      locationScope: "quarter_area",
      urgency: "emergency",
    });
    expect(
      LOCAL_ACTIVITY_PIN_PREVIEW_PINS.filter(
        (pin) => pin.colorState === "red",
      ).map((pin) => pin.id),
    ).toEqual(["preview-warning"]);
  });
});
