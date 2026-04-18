import { describe, it, expect } from "vitest";
import { LEISTUNGEN_DE } from "../content-de";

describe("LEISTUNGEN_DE", () => {
  it("enthaelt genau 5 Eintraege", () => {
    expect(LEISTUNGEN_DE).toHaveLength(5);
  });

  it("alle Eintraege haben country=DE", () => {
    for (const l of LEISTUNGEN_DE) expect(l.country).toBe("DE");
  });

  it("eindeutige slugs", () => {
    const slugs = LEISTUNGEN_DE.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("jeder Eintrag hat https-Link, gueltiges Datum, Rechtsquelle", () => {
    for (const l of LEISTUNGEN_DE) {
      expect(l.officialLink).toMatch(/^https:\/\//);
      expect(l.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.legalSource.length).toBeGreaterThan(3);
      expect(l.title.length).toBeGreaterThan(0);
      expect(l.shortDescription.length).toBeGreaterThan(0);
      expect(l.longDescription.length).toBeGreaterThan(0);
    }
  });

  it("enthaelt die 5 erwarteten Slugs", () => {
    const slugs = LEISTUNGEN_DE.map((l) => l.slug).sort();
    expect(slugs).toEqual([
      "entlastungsbetrag",
      "pflegegeld",
      "pflegegrad",
      "pflegezg-10tage",
      "verhinderungspflege",
    ]);
  });
});
