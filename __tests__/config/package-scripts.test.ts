import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("package scripts", () => {
  it("provides a local production start script that pins .env.local on port 3001", () => {
    expect(packageJson.scripts["start:local"]).toBe(
      "node --env-file=.env.local ./node_modules/next/dist/bin/next start -p 3001",
    );
  });
});
