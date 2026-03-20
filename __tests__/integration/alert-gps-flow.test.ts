import { describe, it, expect } from "vitest";
import { validateLocationData } from "@/lib/alerts/validate-location";
import { getLocationForRole, roundCoordinates } from "@/lib/alerts/location-visibility";
import { GPS_ALERT_CATEGORIES } from "@/lib/constants";

describe("Alert-GPS Integrationstest", () => {
  describe("Kategorie → GPS-Berechtigung", () => {
    it("alle 6 GPS-Kategorien sind korrekt definiert", () => {
      expect(GPS_ALERT_CATEGORIES).toHaveLength(6);
      expect(GPS_ALERT_CATEGORIES).toContain("fire");
      expect(GPS_ALERT_CATEGORIES).toContain("health_concern");
      expect(GPS_ALERT_CATEGORIES).toContain("crime");
      expect(GPS_ALERT_CATEGORIES).toContain("fall");
      expect(GPS_ALERT_CATEGORIES).toContain("water_damage");
      expect(GPS_ALERT_CATEGORIES).toContain("power_outage");
    });

    it("Nicht-GPS-Kategorien sind NICHT enthalten", () => {
      expect(GPS_ALERT_CATEGORIES).not.toContain("door_lock");
      expect(GPS_ALERT_CATEGORIES).not.toContain("shopping");
      expect(GPS_ALERT_CATEGORIES).not.toContain("tech_help");
      expect(GPS_ALERT_CATEGORIES).not.toContain("pet");
      expect(GPS_ALERT_CATEGORIES).not.toContain("other");
    });
  });

  describe("GPS-Validierung → DB", () => {
    it("Bad Säckingen Koordinaten sind gültig", () => {
      const result = validateLocationData(47.5535, 7.964, "gps");
      expect(result.valid).toBe(true);
    });

    it("Null-Insel (0,0) ist gültig aber unwahrscheinlich", () => {
      const result = validateLocationData(0, 0, "gps");
      expect(result.valid).toBe(true);
    });

    it("Negative Koordinaten (Südhalbkugel) sind gültig", () => {
      const result = validateLocationData(-33.8688, 151.2093, "gps");
      expect(result.valid).toBe(true);
    });

    it("Grenzwerte sind gültig", () => {
      expect(validateLocationData(90, 180, "gps").valid).toBe(true);
      expect(validateLocationData(-90, -180, "gps").valid).toBe(true);
    });

    it("Über Grenzwerte sind ungültig", () => {
      expect(validateLocationData(90.1, 0, "gps").valid).toBe(false);
      expect(validateLocationData(0, 180.1, "gps").valid).toBe(false);
    });
  });

  describe("Rollen-Matrix vollständig", () => {
    const alert = { location_lat: 47.5535, location_lng: 7.964, location_source: "gps" as const };

    it("Free → null (kein GPS-Zugriff)", () => {
      expect(getLocationForRole(alert, "free", false)).toBeNull();
      expect(getLocationForRole(alert, "free", true)).toBeNull();
    });

    it("Plus → immer exakt (eigene Familie)", () => {
      const r = getLocationForRole(alert, "plus_family", false);
      expect(r?.exact).toBe(true);
      expect(r?.lat).toBe(47.5535);
      expect(r?.lng).toBe(7.964);
    });

    it("Pro ohne Bestätigung → gerundet (~50m)", () => {
      const r = getLocationForRole(alert, "pro", false);
      expect(r?.exact).toBe(false);
      expect(r?.lat).not.toBe(47.5535); // gerundet
    });

    it("Pro mit Bestätigung → exakt", () => {
      const r = getLocationForRole(alert, "pro", true);
      expect(r?.exact).toBe(true);
      expect(r?.lat).toBe(47.5535);
    });

    it("Pro Medical ohne Bestätigung → gerundet", () => {
      const r = getLocationForRole(alert, "pro_medical", false);
      expect(r?.exact).toBe(false);
    });

    it("Pro Medical mit Bestätigung → exakt", () => {
      const r = getLocationForRole(alert, "pro_medical", true);
      expect(r?.exact).toBe(true);
    });
  });

  describe("DSGVO: Auto-Löschung Szenarien", () => {
    it("resolved Alert ohne GPS wird korrekt behandelt", () => {
      const resolved = { location_lat: null, location_lng: null, location_source: "none" as const };
      expect(getLocationForRole(resolved, "plus_family", false)).toBeNull();
      expect(getLocationForRole(resolved, "pro", true)).toBeNull();
    });

    it("source 'none' gibt immer null", () => {
      const none = { location_lat: 47.5, location_lng: 7.9, location_source: "none" as const };
      expect(getLocationForRole(none, "plus_family", false)).toBeNull();
    });
  });

  describe("50m-Rundung Genauigkeit", () => {
    it("rundet korrekt auf 3 Dezimalstellen", () => {
      const result = roundCoordinates(47.55351, 7.96402);
      expect(result.lat).toBe(47.554);
      expect(result.lng).toBe(7.964);
    });

    it("Rundung erzeugt ~111m Raster (ausreichend für Privatsphäre)", () => {
      // Differenz von 0.001° ≈ 111m am Äquator, ~78m bei 47°N
      const a = roundCoordinates(47.5531, 7.9641);
      const b = roundCoordinates(47.5534, 7.9641);
      expect(a.lat).toBe(b.lat); // beide auf 47.553 gerundet
    });
  });

  describe("Validierung + Sichtbarkeit Kombination", () => {
    it("Valide GPS-Daten → Plus sieht exakt", () => {
      const val = validateLocationData(47.5535, 7.964, "gps");
      expect(val.valid).toBe(true);

      const loc = getLocationForRole(
        { location_lat: 47.5535, location_lng: 7.964, location_source: "gps" },
        "plus_family",
        false,
      );
      expect(loc?.exact).toBe(true);
    });

    it("Household-Fallback → Pro sieht gerundeten Kreis", () => {
      const val = validateLocationData(47.5617, 7.9483, "household");
      expect(val.valid).toBe(true);

      const loc = getLocationForRole(
        { location_lat: 47.5617, location_lng: 7.9483, location_source: "household" },
        "pro",
        false,
      );
      expect(loc?.exact).toBe(false);
      expect(loc?.source).toBe("household");
    });
  });
});
