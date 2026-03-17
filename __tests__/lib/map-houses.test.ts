import { describe, it, expect } from "vitest";
import { STREET_LABELS, STREET_CODE_TO_NAME, isGeoQuarter } from "@/lib/map-houses";

describe("map-houses", () => {
  describe("STREET_LABELS", () => {
    it("enthaelt Laufenburg Strassen", () => {
      expect(STREET_LABELS["HS"]).toBe("Hauptstraße");
      expect(STREET_LABELS["MG"]).toBe("Marktgasse");
      expect(STREET_LABELS["CS"]).toBe("Codmanstraße");
    });

    it("enthaelt weiterhin Bad Saeckingen Strassen", () => {
      expect(STREET_LABELS["PS"]).toBe("Purkersdorfer Str.");
      expect(STREET_LABELS["SN"]).toBe("Sanarystraße");
      expect(STREET_LABELS["OR"]).toBe("Oberer Rebberg");
    });
  });

  describe("STREET_CODE_TO_NAME", () => {
    it("enthaelt Laufenburg Strassennamen", () => {
      expect(STREET_CODE_TO_NAME["HS"]).toBe("Hauptstraße");
      expect(STREET_CODE_TO_NAME["MG"]).toBe("Marktgasse");
      expect(STREET_CODE_TO_NAME["CS"]).toBe("Codmanstraße");
    });
  });

  describe("isGeoQuarter", () => {
    it("erkennt Leaflet-Quartier", () => {
      expect(isGeoQuarter({ type: "leaflet" })).toBe(true);
    });

    it("erkennt SVG-Quartier als nicht-geo", () => {
      expect(isGeoQuarter({ type: "svg" })).toBe(false);
    });

    it("behandelt undefined als nicht-geo", () => {
      expect(isGeoQuarter(undefined)).toBe(false);
    });
  });
});
