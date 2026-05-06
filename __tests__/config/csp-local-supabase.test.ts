import { readFileSync } from "fs";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildContentSecurityPolicy } from "@/lib/security/csp";

const CSP_HELPER = readFileSync(join(process.cwd(), "lib/security/csp.ts"), "utf8");

async function loadNextConfigCspHeader(env: Record<string, string | undefined>) {
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

function getCspDirective(csp: string, directiveName: string) {
  return (
    csp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith(`${directiveName} `)) ?? ""
  );
}

describe("Proxy CSP", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("erlaubt lokale Supabase-API im Development fuer Browser-Smokes", () => {
    expect(CSP_HELPER).toContain("localSupabaseConnectSources");
    expect(CSP_HELPER).toContain("http://127.0.0.1:54321");
    expect(CSP_HELPER).toContain("http://localhost:54321");
  });

  it("setzt keinen statischen CSP-Header mehr, damit Proxy-Nonces nicht kollidieren", async () => {
    const csp = await loadNextConfigCspHeader({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://uylszchlyhbpbmslcnka.supabase.co",
    });

    expect(csp).toBe("");
  }, 15000);

  it("erlaubt lokale Supabase-API fuer lokale Production-E2E-Smokes", () => {
    const csp = buildContentSecurityPolicy({
      isDevelopment: false,
      nonce: "test-nonce",
      supabaseUrl: "http://127.0.0.1:54321",
    });

    expect(csp).toContain("http://127.0.0.1:54321");
    expect(csp).toContain("ws://127.0.0.1:54321");
  });

  it("lockert Production-CSP fuer Cloud-Supabase nicht", () => {
    const csp = buildContentSecurityPolicy({
      isDevelopment: false,
      nonce: "test-nonce",
      supabaseUrl: "https://uylszchlyhbpbmslcnka.supabase.co",
    });

    expect(csp).not.toContain("http://127.0.0.1:54321");
    expect(csp).not.toContain("ws://127.0.0.1:54321");
  });

  it("erlaubt Blob-Worker fuer Next- und Browser-Runtime", () => {
    const csp = buildContentSecurityPolicy({
      isDevelopment: false,
      nonce: "test-nonce",
      supabaseUrl: "https://uylszchlyhbpbmslcnka.supabase.co",
    });

    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("haertet Production-script-src ohne unsafe-inline via Nonce und ohne Turbopack-SRI", async () => {
    const config = await import("../../next.config");
    const csp = buildContentSecurityPolicy({
      isDevelopment: false,
      nonce: "test-nonce",
      supabaseUrl: "https://uylszchlyhbpbmslcnka.supabase.co",
    });

    expect(config.default.experimental?.sri).toBeUndefined();
    expect(getCspDirective(csp, "script-src")).toBe(
      "script-src 'self' 'nonce-test-nonce' 'strict-dynamic'",
    );
    expect(getCspDirective(csp, "style-src")).toBe(
      "style-src 'self' 'unsafe-inline'",
    );
    expect(getCspDirective(csp, "script-src")).not.toContain("'unsafe-inline'");
  }, 15000);
});
