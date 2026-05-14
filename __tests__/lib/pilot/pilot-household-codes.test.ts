import { describe, expect, it } from "vitest";
import {
  buildPilotCodeHint,
  hashPilotAccessCode,
  normalizePilotAccessCode,
  planPilotCodeBatch,
} from "@/lib/pilot/pilot-household-codes";

describe("pilot household access codes", () => {
  it("normalizes printed codes without leaking formatting differences", () => {
    expect(normalizePilotAccessCode(" pilot-abcd-ef23 ")).toBe("PILOTABCDEF23");
  });

  it("hashes codes deterministically and never returns raw code", () => {
    const hash = hashPilotAccessCode("PILOT-ABCD-EF23");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("PILOT");
  });

  it("builds a non-secret support hint", () => {
    expect(buildPilotCodeHint("PILOT-ABCD-EF23")).toBe("PILOT-...EF23");
  });

  it("plans three primary codes per household and separate replacements", () => {
    const plan = planPilotCodeBatch({
      households: [
        { id: "hh-1", quarterId: "q-1", streetName: "Purkersdorfer Strasse", houseNumber: "35" },
        { id: "hh-2", quarterId: "q-1", streetName: "Sanarystrasse", houseNumber: "2" },
      ],
      primaryPerHousehold: 3,
      replacementCount: 2,
      batchLabel: "pilot-0",
    });

    expect(plan.primary).toHaveLength(6);
    expect(plan.replacements).toHaveLength(2);
    expect(plan.primary.every((code) => code.codeKind === "primary")).toBe(true);
    expect(plan.replacements.every((code) => code.householdId === null)).toBe(true);
  });
});
