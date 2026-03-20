import { describe, it, expect } from "vitest";
import { getLocationForRole, roundCoordinates } from "@/lib/alerts/location-visibility";

describe("roundCoordinates", () => {
  it("rundet auf ~50m Ungenauigkeit (3 Dezimalstellen)", () => {
    const result = roundCoordinates(47.553512, 7.964023);
    expect(result.lat).toBe(47.554);
    expect(result.lng).toBe(7.964);
  });
});

describe("getLocationForRole", () => {
  const alertWithGps = {
    location_lat: 47.5535,
    location_lng: 7.964,
    location_source: "gps" as const,
  };

  it("Free-Nutzer: bekommt null", () => {
    const result = getLocationForRole(alertWithGps, "free", false);
    expect(result).toBeNull();
  });

  it("Plus-Angehöriger: bekommt exakte Position", () => {
    const result = getLocationForRole(alertWithGps, "plus_family", false);
    expect(result).toEqual({ lat: 47.5535, lng: 7.964, exact: true, source: "gps" });
  });

  it("Pro ohne Helfer-Bestätigung: bekommt gerundete Position", () => {
    const result = getLocationForRole(alertWithGps, "pro", false);
    expect(result?.exact).toBe(false);
    expect(result?.lat).toBe(47.554);
  });

  it("Pro mit Helfer-Bestätigung: bekommt exakte Position", () => {
    const result = getLocationForRole(alertWithGps, "pro", true);
    expect(result?.exact).toBe(true);
    expect(result?.lat).toBe(47.5535);
  });

  it("Pro Medical ohne Bestätigung: gerundet", () => {
    const result = getLocationForRole(alertWithGps, "pro_medical", false);
    expect(result?.exact).toBe(false);
  });

  it("Pro Medical mit Bestätigung: exakt", () => {
    const result = getLocationForRole(alertWithGps, "pro_medical", true);
    expect(result?.exact).toBe(true);
  });

  it("Alert ohne GPS: gibt null zurück", () => {
    const noGps = { location_lat: null, location_lng: null, location_source: "none" as const };
    const result = getLocationForRole(noGps, "plus_family", false);
    expect(result).toBeNull();
  });
});
