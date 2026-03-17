// Nachbar.io — Tests fuer Konstanten und Konfiguration
// Stellt sicher, dass kritische Geschaeftsregeln korrekt definiert sind
import { describe, it, expect } from "vitest";
import {
  EMERGENCY_CATEGORIES,
  ALERT_CATEGORIES,
  NOTIFICATION_RADIUS,
  PUSH_LIMITS,
  QUARTIER_STREETS,
  QUARTIER_CENTER,
  PILOT_QUARTIER_STREETS,
  PILOT_QUARTIER_CENTER,
} from "./constants";
import { REPUTATION_LEVELS } from "./reputation";

describe("EMERGENCY_CATEGORIES", () => {
  it("enthaelt genau fire, medical und crime", () => {
    expect([...EMERGENCY_CATEGORIES]).toEqual(["fire", "health_concern", "crime"]);
  });

  it("sind alle in ALERT_CATEGORIES enthalten", () => {
    const alertIds = ALERT_CATEGORIES.map((c) => c.id);
    EMERGENCY_CATEGORIES.forEach((cat) => {
      expect(alertIds).toContain(cat);
    });
  });

  it("haben urgency 'emergency' in ALERT_CATEGORIES", () => {
    EMERGENCY_CATEGORIES.forEach((cat) => {
      const alertCat = ALERT_CATEGORIES.find((a) => a.id === cat);
      expect(alertCat?.urgency).toBe("emergency");
    });
  });
});

describe("ALERT_CATEGORIES", () => {
  it("haben alle id, label und icon", () => {
    ALERT_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    });
  });

  it("haben eindeutige IDs", () => {
    const ids = ALERT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("NOTIFICATION_RADIUS", () => {
  it("hat 3 Stufen (1, 2, 3)", () => {
    expect(Object.keys(NOTIFICATION_RADIUS)).toHaveLength(3);
    expect(NOTIFICATION_RADIUS[1]).toBeDefined();
    expect(NOTIFICATION_RADIUS[2]).toBeDefined();
    expect(NOTIFICATION_RADIUS[3]).toBeDefined();
  });

  it("Stufe 1 hat keine Verzoegerung", () => {
    expect(NOTIFICATION_RADIUS[1].delayMinutes).toBe(0);
  });

  it("Verzoegerung steigt mit jeder Stufe", () => {
    expect(NOTIFICATION_RADIUS[1].delayMinutes).toBeLessThan(NOTIFICATION_RADIUS[2].delayMinutes);
    expect(NOTIFICATION_RADIUS[2].delayMinutes).toBeLessThan(NOTIFICATION_RADIUS[3].delayMinutes);
  });
});

describe("PUSH_LIMITS", () => {
  it("begrenzt auf max. 3 pro Stunde", () => {
    expect(PUSH_LIMITS.maxPerHour).toBe(3);
  });

  it("Ruhezeiten sind 22:00 bis 07:00", () => {
    expect(PUSH_LIMITS.quietHoursStart).toBe(22);
    expect(PUSH_LIMITS.quietHoursEnd).toBe(7);
  });
});

describe("PILOT_QUARTIER_STREETS", () => {
  it("enthaelt genau 3 Strassen", () => {
    expect(PILOT_QUARTIER_STREETS).toHaveLength(3);
  });

  it("enthaelt die bekannten Quartiersstrassen", () => {
    expect(PILOT_QUARTIER_STREETS).toContain("Purkersdorfer Straße");
    expect(PILOT_QUARTIER_STREETS).toContain("Sanarystraße");
    expect(PILOT_QUARTIER_STREETS).toContain("Oberer Rebberg");
  });

  it("QUARTIER_STREETS Alias verweist auf PILOT_QUARTIER_STREETS", () => {
    expect(QUARTIER_STREETS).toBe(PILOT_QUARTIER_STREETS);
  });
});

describe("PILOT_QUARTIER_CENTER", () => {
  it("liegt im erwarteten Bereich (Bad Saeckingen)", () => {
    expect(PILOT_QUARTIER_CENTER.lat).toBeGreaterThan(47.5);
    expect(PILOT_QUARTIER_CENTER.lat).toBeLessThan(47.6);
    expect(PILOT_QUARTIER_CENTER.lng).toBeGreaterThan(7.9);
    expect(PILOT_QUARTIER_CENTER.lng).toBeLessThan(8.0);
  });

  it("QUARTIER_CENTER Alias verweist auf PILOT_QUARTIER_CENTER", () => {
    expect(QUARTIER_CENTER).toBe(PILOT_QUARTIER_CENTER);
  });
});

describe("REPUTATION_LEVELS", () => {
  it("hat 5 Level", () => {
    expect(REPUTATION_LEVELS).toHaveLength(5);
  });

  it("beginnt bei Level 1 mit 0 Punkten", () => {
    expect(REPUTATION_LEVELS[0].level).toBe(1);
    expect(REPUTATION_LEVELS[0].minPoints).toBe(0);
  });

  it("minPoints sind aufsteigend sortiert", () => {
    for (let i = 1; i < REPUTATION_LEVELS.length; i++) {
      expect(REPUTATION_LEVELS[i].minPoints).toBeGreaterThan(REPUTATION_LEVELS[i - 1].minPoints);
    }
  });

  it("hat fuer jedes Level name, icon und color", () => {
    REPUTATION_LEVELS.forEach((level) => {
      expect(level.name).toBeTruthy();
      expect(level.icon).toBeTruthy();
      expect(level.color).toBeTruthy();
    });
  });
});
