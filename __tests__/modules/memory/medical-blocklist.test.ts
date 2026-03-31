import { describe, it, expect } from "vitest";
import { containsMedicalTerms } from "@/modules/memory/services/medical-blocklist";

describe("Medical Blocklist", () => {
  it("blockiert Diagnosen", () => {
    expect(containsMedicalTerms("Hat Diabetes Typ 2")).toBe(true);
    expect(containsMedicalTerms("Demenz diagnostiziert")).toBe(true);
    expect(containsMedicalTerms("Parkinson seit 2020")).toBe(true);
  });

  it("blockiert Medikamente", () => {
    expect(containsMedicalTerms("Nimmt Metformin 500mg")).toBe(true);
    expect(containsMedicalTerms("Aspirin taeglich")).toBe(true);
    expect(containsMedicalTerms("Ibuprofen bei Schmerzen")).toBe(true);
  });

  it("blockiert Vitalwerte", () => {
    expect(containsMedicalTerms("Blutdruck 140/90")).toBe(true);
    expect(containsMedicalTerms("Blutzucker zu hoch")).toBe(true);
    expect(containsMedicalTerms("Puls 85")).toBe(true);
  });

  it("blockiert Therapien", () => {
    expect(containsMedicalTerms("Chemotherapie alle 2 Wochen")).toBe(true);
    expect(containsMedicalTerms("Bestrahlung am Montag")).toBe(true);
  });

  it("erlaubt Alltagsbegriffe", () => {
    expect(containsMedicalTerms("Hilfe beim Einkaufen")).toBe(false);
    expect(containsMedicalTerms("Trinkt Kaffee um 8")).toBe(false);
    expect(containsMedicalTerms("Braucht Rollator")).toBe(false);
    expect(containsMedicalTerms("Tochter Anna kommt sonntags")).toBe(false);
    expect(containsMedicalTerms("Mag klassische Musik")).toBe(false);
    expect(containsMedicalTerms("Hoergeraet links")).toBe(false);
  });

  it("ist case-insensitive", () => {
    expect(containsMedicalTerms("hat DIABETES")).toBe(true);
    expect(containsMedicalTerms("nimmt ASPIRIN")).toBe(true);
  });
});
