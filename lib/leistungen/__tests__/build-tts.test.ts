import { describe, it, expect } from "vitest";
import { buildLeistungenTts, MAX_TTS_WORDS, countWords } from "../build-tts";
import { LEISTUNGEN_DE } from "../content-de";
import { LEISTUNGEN_CH_BUND } from "../content-ch-bund";
import { LEISTUNG_CH_EL } from "../content-ch-el";

describe("buildLeistungenTts", () => {
  it("erzeugt einen nicht-leeren Prosatext", () => {
    const text = buildLeistungenTts("DE", LEISTUNGEN_DE);
    expect(text.length).toBeGreaterThan(50);
    expect(text).toMatch(/Was steht uns zu/);
  });

  it("haelt harte Grenze von 400 Wortern ein (DE 5 Leistungen)", () => {
    const text = buildLeistungenTts("DE", LEISTUNGEN_DE);
    expect(countWords(text)).toBeLessThanOrEqual(MAX_TTS_WORDS);
  });

  it("haelt harte Grenze von 400 Wortern ein (CH 5 Leistungen)", () => {
    const chAll = [...LEISTUNGEN_CH_BUND, LEISTUNG_CH_EL];
    const text = buildLeistungenTts("CH", chAll);
    expect(countWords(text)).toBeLessThanOrEqual(MAX_TTS_WORDS);
  });

  it("verweist bei DE auf Pflegekasse, bei CH auf Ausgleichskasse", () => {
    expect(buildLeistungenTts("DE", LEISTUNGEN_DE)).toMatch(/Pflegekasse/);
    expect(
      buildLeistungenTts("CH", [...LEISTUNGEN_CH_BUND, LEISTUNG_CH_EL]),
    ).toMatch(/Ausgleichskasse|IV-Stelle/);
  });

  it("enthaelt alle Leistungs-Titel", () => {
    const text = buildLeistungenTts("DE", LEISTUNGEN_DE);
    for (const l of LEISTUNGEN_DE) {
      expect(text).toContain(l.title);
    }
  });

  it("ist deterministisch (idempotent)", () => {
    const a = buildLeistungenTts("DE", LEISTUNGEN_DE);
    const b = buildLeistungenTts("DE", LEISTUNGEN_DE);
    expect(a).toBe(b);
  });
});
