import { describe, it, expect } from "vitest";
import {
  buildPromptBlock,
  rankByRelevance,
} from "@/modules/memory/services/memory-loader";
import type { MemoryFact } from "@/modules/memory/types";

describe("Memory Loader", () => {
  describe("buildPromptBlock", () => {
    it("baut Prompt mit Core-Profil", () => {
      const core: Partial<MemoryFact>[] = [
        { category: "profile", key: "name", value: "Herr Mueller" },
        { category: "profile", key: "anrede", value: "Sie" },
      ];

      const result = buildPromptBlock(core as MemoryFact[], [], []);
      expect(result).toContain("Herr Mueller");
      expect(result).toContain("Sie");
    });

    it("gibt leeren String bei keinen Fakten", () => {
      const result = buildPromptBlock([], [], []);
      expect(result).toBe("");
    });

    it("inkludiert relevante Basis-Fakten", () => {
      const core: Partial<MemoryFact>[] = [
        { category: "profile", key: "name", value: "Herr Mueller" },
      ];
      const relevant: Partial<MemoryFact>[] = [
        {
          category: "routine",
          key: "kaffee",
          value: "Kaffee schwarz um 8 Uhr",
        },
        {
          category: "contact",
          key: "tochter",
          value: "Tochter Anna kommt sonntags",
        },
      ];

      const result = buildPromptBlock(
        core as MemoryFact[],
        relevant as MemoryFact[],
        [],
      );
      expect(result).toContain("Kaffee schwarz um 8 Uhr");
      expect(result).toContain("Tochter Anna");
    });
  });

  describe("Relevanz-Ranking", () => {
    it("rankt Fakten nach Keyword-Match", () => {
      const facts: Partial<MemoryFact>[] = [
        { key: "kaffee", value: "Trinkt Kaffee um 8", category: "routine" },
        {
          key: "tochter",
          value: "Tochter Anna kommt sonntags",
          category: "contact",
        },
        { key: "musik", value: "Mag klassische Musik", category: "preference" },
      ];

      const result = rankByRelevance(
        facts as MemoryFact[],
        "Wann kommt meine Tochter?",
      );
      expect(result[0].key).toBe("tochter");
    });
  });
});
