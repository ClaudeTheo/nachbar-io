import { describe, it, expect } from "vitest";
import { KI_HELP_FAQ } from "@/lib/ki-help/faq-content";

describe("KI_HELP_FAQ", () => {
  it("hat exakt 7 Items (Founder-Approve 2026-04-27)", () => {
    expect(KI_HELP_FAQ).toHaveLength(7);
  });

  it("hat eindeutige IDs", () => {
    const ids = KI_HELP_FAQ.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hat keine leeren Strings in question/answer", () => {
    for (const item of KI_HELP_FAQ) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("enthaelt die erwarteten Schluessel-IDs (Snapshot gegen Design)", () => {
    const ids = KI_HELP_FAQ.map((item) => item.id);
    expect(ids).toEqual([
      "what",
      "later-help",
      "active-now",
      "data",
      "switch-off",
      "levels",
      "personal-locked",
    ]);
  });

  it("personal-locked-Antwort erwaehnt Schutzmassnahmen + Info-statt-Auto-Freischaltung", () => {
    const item = KI_HELP_FAQ.find((i) => i.id === "personal-locked");
    expect(item).toBeDefined();
    expect(item!.answer).toMatch(/Schutzmaßnahmen/);
    // Codex-Review 2026-04-28 P3: kein implizites Auto-Freischalten,
    // sondern Info + erneute User-Entscheidung
    expect(item!.answer).toMatch(/Sobald/);
    expect(item!.answer).toMatch(/informieren wir Sie/);
    expect(item!.answer).toMatch(/neu entscheiden/);
    expect(item!.answer).not.toMatch(/schalten wir die Stufe frei/);
  });

  it("data-Antwort verspricht KEINE konkrete Verarbeitung vor Consent", () => {
    const item = KI_HELP_FAQ.find((i) => i.id === "data");
    expect(item).toBeDefined();
    expect(item!.answer).not.toMatch(
      /pseudonymisiert|anonymisiert|verschluesselt/i,
    );
    expect(item!.answer).toMatch(/Vor Ihrer Einwilligung/);
  });
});
