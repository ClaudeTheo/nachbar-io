import { describe, it, expect } from "vitest";
import { GPS_ALERT_CATEGORIES, ALERT_CATEGORIES } from "@/lib/constants";

describe("GPS_ALERT_CATEGORIES", () => {
  it("enthält genau die 6 GPS-fähigen Kategorien", () => {
    expect(GPS_ALERT_CATEGORIES).toEqual([
      "fire", "health_concern", "crime", "fall", "water_damage", "power_outage",
    ]);
  });

  it("alle GPS-Kategorien existieren auch in ALERT_CATEGORIES", () => {
    const allIds = ALERT_CATEGORIES.map((c) => c.id);
    for (const cat of GPS_ALERT_CATEGORIES) {
      expect(allIds).toContain(cat);
    }
  });

  it("Nicht-GPS-Kategorien sind NICHT enthalten", () => {
    expect(GPS_ALERT_CATEGORIES).not.toContain("door_lock");
    expect(GPS_ALERT_CATEGORIES).not.toContain("shopping");
    expect(GPS_ALERT_CATEGORIES).not.toContain("tech_help");
    expect(GPS_ALERT_CATEGORIES).not.toContain("pet");
    expect(GPS_ALERT_CATEGORIES).not.toContain("other");
  });
});
