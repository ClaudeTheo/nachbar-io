// Nachbar.io — Companion Integration Tests
// Prueft die Konsistenz zwischen Tools, System-Prompt und Write-Tool-Set

import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/modules/voice/services/system-prompt";
import { companionTools, WRITE_TOOLS } from "@/modules/voice/services/tools";
import { isWriteTool } from "@/modules/voice/services/tool-executor";

describe("Companion Integration", () => {
  it("should have matching tools and write-tool set", () => {
    const toolNames = companionTools.map((t) => t.name);
    for (const writeTool of WRITE_TOOLS) {
      expect(toolNames).toContain(writeTool);
    }
  });

  it("should mark exactly 12 tools as write tools", () => {
    expect(WRITE_TOOLS.size).toBe(12);
  });

  it("should have 9 read-only tools", () => {
    const readTools = companionTools.filter((t) => !isWriteTool(t.name));
    expect(readTools.length).toBe(9);
  });

  it("should build system prompt with all context types", () => {
    const prompt = buildSystemPrompt({
      quarterName: "Test",
      wasteDate: [{ date: "2026-03-25", type: "Restmuell" }],
      events: [{ title: "Fest", date: "2026-04-01" }],
      bulletinPosts: [{ title: "Post", category: "info" }],
    });
    expect(prompt).toContain("Test");
    expect(prompt).toContain("Restmuell");
    expect(prompt).toContain("Fest");
    expect(prompt).toContain("Post");
    expect(prompt).toContain("Sie");
  });

  it("should have all tools with valid Anthropic format", () => {
    for (const tool of companionTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeTruthy();
      expect(tool.input_schema.type).toBe("object");
    }
  });

  it("should have exactly 21 tools total", () => {
    expect(companionTools.length).toBe(21);
  });

  it("should have unique tool names", () => {
    const names = companionTools.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("should contain navigate_to as read-only tool", () => {
    const navigateTool = companionTools.find((t) => t.name === "navigate_to");
    expect(navigateTool).toBeDefined();
    expect(isWriteTool("navigate_to")).toBe(false);
  });

  it("should build system prompt with empty context", () => {
    const prompt = buildSystemPrompt({
      quarterName: "Leer-Quartier",
      wasteDate: [],
      events: [],
      bulletinPosts: [],
    });
    expect(prompt).toContain("Leer-Quartier");
    expect(prompt).toContain("Keine aktuellen Infos");
  });

  it("should format dates in system prompt as DD.MM.YYYY", () => {
    const prompt = buildSystemPrompt({
      quarterName: "Test",
      wasteDate: [{ date: "2026-03-25", type: "Bio" }],
      events: [{ title: "Markt", date: "2026-04-01" }],
      bulletinPosts: [],
    });
    expect(prompt).toContain("25.03.2026");
    expect(prompt).toContain("01.04.2026");
  });
});
