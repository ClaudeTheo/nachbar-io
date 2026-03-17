import { describe, it, expect } from "vitest";
import {
  isGeoQuarter, DEFAULT_HOUSES, STREET_CODE_TO_NAME,
  type StreetCode,
} from "@/lib/map-houses";

describe("Cross-Quartier-Isolation", () => {
  // Bad Saeckingen StreetCodes
  const BS_CODES: StreetCode[] = ["PS", "SN", "OR"];
  // Laufenburg StreetCodes
  const LF_CODES: StreetCode[] = ["HS", "MG", "CS"];

  describe("StreetCode-Trennung", () => {
    it("DEFAULT_HOUSES enthaelt nur Bad Saeckingen Codes", () => {
      const codes = new Set(DEFAULT_HOUSES.map(h => h.s));
      // Alle Codes muessen BS-Codes sein
      for (const code of codes) {
        expect(BS_CODES).toContain(code);
      }
      // Keine Laufenburg-Codes in DEFAULT_HOUSES
      for (const code of LF_CODES) {
        expect(codes.has(code)).toBe(false);
      }
    });

    it("STREET_CODE_TO_NAME hat Eintraege fuer beide Quartiere", () => {
      for (const code of [...BS_CODES, ...LF_CODES]) {
        expect(STREET_CODE_TO_NAME[code]).toBeDefined();
        expect(STREET_CODE_TO_NAME[code].length).toBeGreaterThan(0);
      }
    });

    it("BS und LF StreetCodes ueberschneiden sich nicht", () => {
      const overlap = BS_CODES.filter(c => LF_CODES.includes(c));
      expect(overlap).toHaveLength(0);
    });
  });

  describe("isGeoQuarter Routing", () => {
    it("routet Bad Saeckingen (svg) zur SVG-Karte", () => {
      expect(isGeoQuarter({ type: "svg" })).toBe(false);
    });

    it("routet Laufenburg (leaflet) zur Leaflet-Karte", () => {
      expect(isGeoQuarter({ type: "leaflet" })).toBe(true);
    });

    it("routet undefined zur SVG-Karte (Fallback)", () => {
      expect(isGeoQuarter(undefined)).toBe(false);
      expect(isGeoQuarter({})).toBe(false);
    });

    it("routet leeres map_config zur SVG-Karte", () => {
      expect(isGeoQuarter({ type: undefined })).toBe(false);
    });
  });

  describe("DEFAULT_HOUSES Integritaet", () => {
    it("jedes Haus hat gueltige Koordinaten", () => {
      for (const h of DEFAULT_HOUSES) {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.y).toBeGreaterThanOrEqual(0);
        expect(h.num.length).toBeGreaterThan(0);
      }
    });

    it("Haus-IDs sind eindeutig", () => {
      const ids = DEFAULT_HOUSES.map(h => h.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("alle Haeuser haben defaultColor green", () => {
      for (const h of DEFAULT_HOUSES) {
        expect(h.defaultColor).toBe("green");
      }
    });
  });
});
