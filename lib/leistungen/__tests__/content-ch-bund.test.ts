import { describe, it, expect } from "vitest";
import { LEISTUNGEN_CH_BUND } from "../content-ch-bund";

describe("LEISTUNGEN_CH_BUND", () => {
  it("enthaelt genau 4 Eintraege", () => {
    expect(LEISTUNGEN_CH_BUND).toHaveLength(4);
  });

  it("alle Eintraege haben country=CH", () => {
    for (const l of LEISTUNGEN_CH_BUND) expect(l.country).toBe("CH");
  });

  it("eindeutige slugs", () => {
    const slugs = LEISTUNGEN_CH_BUND.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("jeder Eintrag hat https-Link, gueltiges Datum, Rechtsquelle", () => {
    for (const l of LEISTUNGEN_CH_BUND) {
      expect(l.officialLink).toMatch(/^https:\/\//);
      expect(l.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.legalSource.length).toBeGreaterThan(3);
      expect(l.title.length).toBeGreaterThan(0);
    }
  });

  it("enthaelt die 4 erwarteten Slugs", () => {
    const slugs = LEISTUNGEN_CH_BUND.map((l) => l.slug).sort();
    expect(slugs).toEqual([
      "ahv-betreuungsgutschrift",
      "ahv-iv-hilflosenentschaedigung",
      "iv-assistenzbeitrag",
      "or-329h-betreuungsurlaub",
    ]);
  });
});
