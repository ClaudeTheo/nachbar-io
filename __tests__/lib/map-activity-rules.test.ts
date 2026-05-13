import { describe, expect, it } from "vitest";

import { resolveMapActivityPinRule } from "@/lib/map-activity-rules";

describe("map activity rules", () => {
  it("leitet normale Rasenhilfe als gruenen Haus-Pin ab", () => {
    expect(
      resolveMapActivityPinRule({
        category: "garden",
        title: "Rasen maehen",
        urgency: "normal",
      }),
    ).toEqual({
      type: "mowing",
      urgency: "normal",
      colorState: "green",
      locationScope: "home",
    });
  });

  it("macht dringende Hilfe gelb, aber nicht rot", () => {
    expect(
      resolveMapActivityPinRule({
        category: "shopping",
        urgency: "urgent",
      }),
    ).toEqual({
      type: "shopping",
      urgency: "urgent",
      colorState: "yellow",
      locationScope: "home",
    });
  });

  it("reserviert Rot fuer echte Notfaelle und Unfalllagen", () => {
    expect(
      resolveMapActivityPinRule({
        category: "medical",
        isEmergency: true,
      }),
    ).toEqual({
      type: "warning",
      urgency: "emergency",
      colorState: "red",
      locationScope: "quarter_area",
    });
  });

  it("leitet Urlaub und Abwesenheit als blauen Sonderstatus ab", () => {
    expect(
      resolveMapActivityPinRule({
        category: "vacation",
        urgency: "status",
      }),
    ).toEqual({
      type: "companion",
      urgency: "status",
      colorState: "blue",
      locationScope: "home",
    });
  });

  it("setzt Treff-, Lern- und Sportpunkte auf bewusste Treffpunkte", () => {
    expect(resolveMapActivityPinRule({ category: "learning" })).toMatchObject({
      type: "learning",
      colorState: "green",
      locationScope: "meeting_point",
    });
    expect(resolveMapActivityPinRule({ category: "sport" })).toMatchObject({
      type: "sport",
      colorState: "green",
      locationScope: "meeting_point",
    });
  });
});
