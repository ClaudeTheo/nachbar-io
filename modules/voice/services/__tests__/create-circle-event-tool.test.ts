// Test: create_circle_event Tool-Definition + WRITE_TOOLS Registration (E-4)
import { describe, it, expect } from "vitest";
import { companionTools, WRITE_TOOLS } from "../tools";

describe("create_circle_event tool", () => {
  const tool = companionTools.find((t) => t.name === "create_circle_event");

  it("ist in companionTools registriert", () => {
    expect(tool).toBeDefined();
  });

  it("hat die richtigen required-Felder", () => {
    expect(tool!.input_schema.required).toEqual(
      expect.arrayContaining(["person", "date", "what"]),
    );
  });

  it("hat person, date, time, what properties", () => {
    const props = Object.keys(tool!.input_schema.properties);
    expect(props).toContain("person");
    expect(props).toContain("date");
    expect(props).toContain("time");
    expect(props).toContain("what");
  });

  it("ist als Write-Tool registriert", () => {
    expect(WRITE_TOOLS.has("create_circle_event")).toBe(true);
  });
});

describe("ALLOWED_ROUTES", () => {
  const navigateTool = companionTools.find((t) => t.name === "navigate_to");
  const routes = (
    navigateTool!.input_schema.properties.route as { enum: string[] }
  ).enum;

  it("enthaelt /mein-kreis/termine", () => {
    expect(routes).toContain("/mein-kreis/termine");
  });

  it("enthaelt /mein-kreis", () => {
    expect(routes).toContain("/mein-kreis");
  });
});
