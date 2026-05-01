import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import packageJson from "@/package.json";

describe("package scripts", () => {
  it("provides a local production build script that prefers .env.local over .env.production.local", () => {
    expect(packageJson.scripts["build:local"]).toBe(
      "node scripts/start-local-production.mjs build",
    );
  });

  it("provides a local production start script that pins .env.local on port 3001", () => {
    expect(packageJson.scripts["start:local"]).toBe(
      "node scripts/start-local-production.mjs start -p 3001",
    );
  });

  it("normalizes start:local to the Supabase API port from supabase/config.toml", () => {
    const script = readFileSync("scripts/start-local-production.mjs", "utf8");

    expect(script).toContain("supabase");
    expect(script).toContain("config.toml");
    expect(script).toContain(".env.local");
    expect(script).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(script).toContain("127.0.0.1");
    expect(script).not.toContain("54421");
  });
});
