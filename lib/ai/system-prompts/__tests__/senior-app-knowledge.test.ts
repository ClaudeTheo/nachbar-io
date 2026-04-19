import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Test prueft das App-Wissensdokument fuer die Senior-KI.
// Das Dokument wird zur Laufzeit in den System-Prompt von Claude/Mistral
// geladen. Wir pruefen nur strukturelle Pflicht-Marker + Wortzahl +
// Emoji-Freiheit, keinen exakten Textinhalt.
describe("senior-app-knowledge.md", () => {
  const file = readFileSync(
    path.join(__dirname, "..", "senior-app-knowledge.md"),
    "utf-8",
  );

  it("hat mindestens 3000 Woerter", () => {
    const wordCount = file.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(3000);
  });

  // Pflicht-Marker: diese Schluesselbegriffe muessen im Dokument vorkommen,
  // sonst fehlt eine kritische Regel fuer die KI.
  const MARKER = [
    "Siezen",
    "save_memory",
    "DSGVO",
    "revDSG",
    "112",
    "110",
    "117",
    "118",
    "144",
    "Spitex",
    "HARTE_LAENGE",
  ];
  for (const m of MARKER) {
    it(`enthaelt Pflicht-Marker "${m}"`, () => {
      expect(file).toContain(m);
    });
  }

  it("enthaelt keine Emojis", () => {
    // Grobe Naeherung: kein Codepoint im Emoji-Bereich
    const emojiRegex = /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/u;
    expect(file).not.toMatch(emojiRegex);
  });
});
