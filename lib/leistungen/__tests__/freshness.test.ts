import { describe, it, expect } from "vitest";
import { ALL_LEISTUNGEN } from "../content";

// Dieser Test erzwingt einen halbjaehrlichen Content-Review.
// Wenn er rot wird, ist die Pflicht zur Aktualisierung der Sozialleistungs-
// Daten erreicht — bitte offizielle Quellen pruefen und lastReviewed anheben.
const MAX_AGE_DAYS = 210;

describe("Leistungen freshness", () => {
  for (const l of ALL_LEISTUNGEN) {
    it(`${l.country}/${l.slug} juenger als ${MAX_AGE_DAYS} Tage`, () => {
      const ageDays =
        (Date.now() - new Date(l.lastReviewed).getTime()) / 86_400_000;
      expect(ageDays).toBeLessThan(MAX_AGE_DAYS);
    });
  }
});
