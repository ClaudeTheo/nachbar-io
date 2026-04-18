import { describe, it, expect } from "vitest";
import { getLeistungenForCountry, ALL_LEISTUNGEN } from "../content";

describe("content aggregator", () => {
  it("ALL_LEISTUNGEN enthaelt 10 Eintraege", () => {
    expect(ALL_LEISTUNGEN).toHaveLength(10);
  });

  it("DE-Filter liefert 5", () => {
    expect(getLeistungenForCountry("DE")).toHaveLength(5);
  });

  it("CH-Filter liefert 5", () => {
    expect(getLeistungenForCountry("CH")).toHaveLength(5);
  });

  it("alle slugs global eindeutig", () => {
    const slugs = ALL_LEISTUNGEN.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
