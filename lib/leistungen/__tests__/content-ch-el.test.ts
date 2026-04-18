import { describe, it, expect } from "vitest";
import { LEISTUNG_CH_EL } from "../content-ch-el";
import { CURATED_CANTONS } from "../types";

describe("LEISTUNG_CH_EL", () => {
  it("slug=el-kubk + country=CH", () => {
    expect(LEISTUNG_CH_EL.slug).toBe("el-kubk");
    expect(LEISTUNG_CH_EL.country).toBe("CH");
  });

  it("enthaelt cantonVariants fuer alle 6 curated cantons", () => {
    for (const c of CURATED_CANTONS) {
      expect(LEISTUNG_CH_EL.cantonVariants?.[c]).toBeDefined();
      expect(LEISTUNG_CH_EL.cantonVariants?.[c]?.amount.length).toBeGreaterThan(
        0,
      );
      expect(LEISTUNG_CH_EL.cantonVariants?.[c]?.officialLink).toMatch(
        /^https:\/\//,
      );
      expect(LEISTUNG_CH_EL.cantonVariants?.[c]?.note.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("hat legale Quelle + Haupt-Link", () => {
    expect(LEISTUNG_CH_EL.legalSource).toContain("ELG");
    expect(LEISTUNG_CH_EL.officialLink).toMatch(/^https:\/\//);
    expect(LEISTUNG_CH_EL.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
