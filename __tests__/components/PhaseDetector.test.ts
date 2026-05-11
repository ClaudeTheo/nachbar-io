import { describe, it, expect } from "vitest";
import { getPhase } from "@/components/PhaseDetector";

// Phase-Grenzen (Handover 2026-05-11):
// Morgen 06-11, Mittag 11-15, Nachmittag 15-19, Abend 19-23, Nacht 23-06
describe("getPhase", () => {
  describe("Nacht 23-06", () => {
    it("23 Uhr -> nacht", () => expect(getPhase(23)).toBe("nacht"));
    it("0 Uhr  -> nacht", () => expect(getPhase(0)).toBe("nacht"));
    it("3 Uhr  -> nacht", () => expect(getPhase(3)).toBe("nacht"));
    it("5 Uhr  -> nacht (Grenze vor Morgen)", () => expect(getPhase(5)).toBe("nacht"));
  });

  describe("Morgen 06-11", () => {
    it("6 Uhr  -> morgen (Untergrenze)", () => expect(getPhase(6)).toBe("morgen"));
    it("9 Uhr  -> morgen", () => expect(getPhase(9)).toBe("morgen"));
    it("10 Uhr -> morgen (Obergrenze)", () => expect(getPhase(10)).toBe("morgen"));
  });

  describe("Mittag 11-15", () => {
    it("11 Uhr -> mittag (Untergrenze)", () => expect(getPhase(11)).toBe("mittag"));
    it("12 Uhr -> mittag", () => expect(getPhase(12)).toBe("mittag"));
    it("14 Uhr -> mittag (Obergrenze)", () => expect(getPhase(14)).toBe("mittag"));
  });

  describe("Nachmittag 15-19", () => {
    it("15 Uhr -> nachmittag (Untergrenze)", () => expect(getPhase(15)).toBe("nachmittag"));
    it("17 Uhr -> nachmittag", () => expect(getPhase(17)).toBe("nachmittag"));
    it("18 Uhr -> nachmittag (Obergrenze)", () => expect(getPhase(18)).toBe("nachmittag"));
  });

  describe("Abend 19-23", () => {
    it("19 Uhr -> abend (Untergrenze)", () => expect(getPhase(19)).toBe("abend"));
    it("21 Uhr -> abend", () => expect(getPhase(21)).toBe("abend"));
    it("22 Uhr -> abend (Obergrenze)", () => expect(getPhase(22)).toBe("abend"));
  });
});
