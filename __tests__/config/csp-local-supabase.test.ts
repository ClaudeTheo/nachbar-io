import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const NEXT_CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("next.config CSP", () => {
  it("erlaubt lokale Supabase-API im Development fuer Browser-Smokes", () => {
    expect(NEXT_CONFIG).toContain("localSupabaseConnectSources");
    expect(NEXT_CONFIG).toContain("http://127.0.0.1:54321");
    expect(NEXT_CONFIG).toContain("http://localhost:54321");
  });
});
