import { describe, it, expect } from "vitest";
import { getMonthlyReportSubject, getMonthLabel } from "../email";

describe("hilfe email helpers", () => {
  it("generates correct monthly report subject", () => {
    expect(getMonthlyReportSubject("2026-03", "Max Mustermann")).toBe(
      "Sammelabrechnung Maerz 2026 — Max Mustermann",
    );
  });

  it("returns German month labels", () => {
    expect(getMonthLabel("2026-01")).toBe("Januar 2026");
    expect(getMonthLabel("2026-03")).toBe("Maerz 2026");
    expect(getMonthLabel("2026-12")).toBe("Dezember 2026");
  });
});
