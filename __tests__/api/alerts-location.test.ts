import { describe, it, expect } from "vitest";
import { validateLocationData } from "@/modules/alerts/services/validate-location";

describe("validateLocationData", () => {
  it("akzeptiert gültige GPS-Daten", () => {
    const result = validateLocationData(47.5535, 7.964, "gps");
    expect(result.valid).toBe(true);
  });

  it("lehnt ungültige Latitude ab", () => {
    const result = validateLocationData(91, 7.964, "gps");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Latitude");
  });

  it("lehnt ungültige Longitude ab", () => {
    const result = validateLocationData(47.5, 181, "gps");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Longitude");
  });

  it("akzeptiert source 'none' ohne Koordinaten", () => {
    const result = validateLocationData(null, null, "none");
    expect(result.valid).toBe(true);
  });

  it("lehnt unbekannte source ab", () => {
    const result = validateLocationData(47.5, 7.9, "satellite" as "gps");
    expect(result.valid).toBe(false);
  });

  it("akzeptiert source 'household'", () => {
    const result = validateLocationData(47.5, 7.9, "household");
    expect(result.valid).toBe(true);
  });

  it("lehnt GPS-Source ohne Koordinaten ab", () => {
    const result = validateLocationData(null, null, "gps");
    expect(result.valid).toBe(false);
  });
});
