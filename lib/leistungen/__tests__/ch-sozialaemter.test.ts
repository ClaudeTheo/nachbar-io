import { describe, it, expect } from "vitest";
import { CH_SOZIALAEMTER } from "../ch-sozialaemter";

describe("CH_SOZIALAEMTER", () => {
  const EXPECTED_CANTONS = [
    "AG",
    "AI",
    "AR",
    "BE",
    "BL",
    "BS",
    "FR",
    "GE",
    "GL",
    "GR",
    "JU",
    "LU",
    "NE",
    "NW",
    "OW",
    "SG",
    "SH",
    "SO",
    "SZ",
    "TG",
    "TI",
    "UR",
    "VD",
    "VS",
    "ZG",
    "ZH",
  ];

  it("enthaelt alle 26 Kantone", () => {
    for (const c of EXPECTED_CANTONS) expect(CH_SOZIALAEMTER[c]).toBeDefined();
    expect(Object.keys(CH_SOZIALAEMTER)).toHaveLength(26);
  });

  it("jeder Kanton hat name + https-url", () => {
    for (const c of EXPECTED_CANTONS) {
      expect(CH_SOZIALAEMTER[c].name.length).toBeGreaterThan(0);
      expect(CH_SOZIALAEMTER[c].url).toMatch(/^https:\/\//);
    }
  });
});
