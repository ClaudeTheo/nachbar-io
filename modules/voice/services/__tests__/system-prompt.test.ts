// Test: Harte Antwort-Laengen-Regel im System-Prompt (Layer-1 Cache Handoff)
import { describe, it, expect } from "vitest";
import { buildSystemPrompt, QuarterContext } from "../system-prompt";

const emptyCtx: QuarterContext = {
  quarterName: "Test-Quartier",
  wasteDate: [],
  events: [],
  bulletinPosts: [],
};

describe("buildSystemPrompt — harte Antwort-Laengen-Regel", () => {
  it("enthaelt 'Maximal 2 Saetze'", () => {
    const prompt = buildSystemPrompt(emptyCtx, { mutLevel: 1 });
    expect(prompt).toContain("Maximal 2 Saetze");
  });

  it("enthaelt 'Maximal 30 Woerter'", () => {
    const prompt = buildSystemPrompt(emptyCtx, { mutLevel: 1 });
    expect(prompt).toContain("Maximal 30 Woerter");
  });

  it("verbietet Einleitungen wie 'Gerne'", () => {
    const prompt = buildSystemPrompt(emptyCtx, { mutLevel: 1 });
    expect(prompt).toContain("Keine Einleitungen");
  });

  it("enthaelt harte Regel fuer alle Mut-Stufen", () => {
    for (const mutLevel of [1, 2, 3, 4] as const) {
      const prompt = buildSystemPrompt(emptyCtx, { mutLevel });
      expect(prompt).toContain("Maximal 2 Saetze");
    }
  });

  it("enthaelt die weiche '2-3 Saetze'-Regel NICHT mehr (Widerspruch-Vermeidung)", () => {
    const prompt = buildSystemPrompt(emptyCtx, { mutLevel: 1 });
    expect(prompt).not.toMatch(/Halte Antworten kurz \(2-3 Saetze\)/);
    expect(prompt).not.toMatch(/max 2-3 Saetze/);
  });

  it("ergaenzt bei patienceMode einfache, ruhige Antwortregeln ohne Medizin-Drift", () => {
    const prompt = buildSystemPrompt(emptyCtx, {
      mutLevel: 1,
      patienceMode: true,
    });

    expect(prompt).toContain("SEHR EINFACHE ANTWORTEN");
    expect(prompt).toContain("ein Gedanke pro Satz");
    expect(prompt).toContain("Wiederhole wichtige Informationen einmal ruhig");
    expect(prompt).toContain("KEINE Medikamenten-Fragen");
    expect(prompt).toContain("KEINE Gesundheits-Fragen");
    expect(prompt).not.toMatch(/Demenzmodus|Alzheimer|senil/i);
  });

  it("laesst den Geduldsmodus weg, wenn patienceMode nicht aktiv ist", () => {
    const prompt = buildSystemPrompt(emptyCtx, { mutLevel: 1 });
    expect(prompt).not.toContain("SEHR EINFACHE ANTWORTEN");
  });
});
