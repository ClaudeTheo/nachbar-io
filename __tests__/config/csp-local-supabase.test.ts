import { readFileSync } from "fs";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const NEXT_CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

async function loadCspHeader(env: Record<string, string | undefined>) {
  vi.resetModules();

  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  const config = await import("../../next.config");
  const headers = await config.default.headers?.();
  const cspHeader = headers
    ?.flatMap((entry) => entry.headers)
    .find((header) => header.key === "Content-Security-Policy");

  return cspHeader?.value ?? "";
}

describe("next.config CSP", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("erlaubt lokale Supabase-API im Development fuer Browser-Smokes", () => {
    expect(NEXT_CONFIG).toContain("localSupabaseConnectSources");
    expect(NEXT_CONFIG).toContain("http://127.0.0.1:54321");
    expect(NEXT_CONFIG).toContain("http://localhost:54321");
  });

  it("erlaubt lokale Supabase-API fuer lokale Production-E2E-Smokes", async () => {
    const csp = await loadCspHeader({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });

    expect(csp).toContain("http://127.0.0.1:54321");
    expect(csp).toContain("ws://127.0.0.1:54321");
  });

  it("lockert Production-CSP fuer Cloud-Supabase nicht", async () => {
    const csp = await loadCspHeader({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://uylszchlyhbpbmslcnka.supabase.co",
    });

    expect(csp).not.toContain("http://127.0.0.1:54321");
    expect(csp).not.toContain("ws://127.0.0.1:54321");
  });
});
