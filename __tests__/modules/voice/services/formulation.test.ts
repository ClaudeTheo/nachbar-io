import { describe, it, expect } from "vitest";
import { buildFormulationPrompt } from "@/modules/voice/services/system-prompt";

describe("buildFormulationPrompt (H-3)", () => {
  it("enthaelt den Empfaenger-Namen", () => {
    const prompt = buildFormulationPrompt("Anna", 1);
    expect(prompt).toContain("Anna");
  });

  it("Mut-Stufe 1 erzeugt minimale Umformulierung", () => {
    const prompt = buildFormulationPrompt("Anna", 1);
    expect(prompt).toMatch(/[Mm]inimal/);
  });

  it("Mut-Stufe 4 erzeugt kreativere Umformulierung", () => {
    const prompt = buildFormulationPrompt("Anna", 4);
    expect(prompt).toMatch(/[Kk]reativ/);
  });

  it("Default Mut-Stufe ist 1", () => {
    const prompt = buildFormulationPrompt("Anna");
    expect(prompt).toMatch(/[Mm]inimal/);
  });

  it("enthaelt Siezen-Anweisung", () => {
    const prompt = buildFormulationPrompt("Anna", 2);
    expect(prompt).toContain("Sie");
  });
});
