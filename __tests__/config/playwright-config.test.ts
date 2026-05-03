import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Playwright E2E config", () => {
  it("runs the localhost Supabase preflight for direct multi-agent Playwright calls", () => {
    const config = readFileSync("tests/e2e/playwright.config.ts", "utf8");

    expect(config).toContain("globalSetup");
    expect(config).toContain("e2e-localhost-preflight");
  });

  it("runs the localhost Supabase preflight for direct root Playwright calls", () => {
    const config = readFileSync("playwright.config.ts", "utf8");

    expect(config).toContain("globalSetup");
    expect(config).toContain("e2e-localhost-preflight");
  });
});
