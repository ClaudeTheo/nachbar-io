// Tests fuer Phase I: Legacy-Route-Blocking in Middleware
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock alle Middleware-Dependencies
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn().mockResolvedValue(new Response()),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  getClientKey: vi.fn().mockReturnValue("test"),
}));
vi.mock("@/lib/security/security-middleware", () => ({
  checkSecurity: vi
    .fn()
    .mockResolvedValue({ allowed: true, rateLimitDivisor: 1 }),
}));
vi.mock("@/lib/security/traps/brute-force", () => ({
  recordAuthRateLimit: vi.fn(),
}));
vi.mock("@/lib/security/client-key", () => ({
  buildClientKeys: vi.fn(),
}));

import { middleware } from "@/middleware";

function makeRequest(pathname: string) {
  const url = new URL(`http://localhost${pathname}`);
  const cloneableUrl = Object.assign(url, {
    clone: () => new URL(url.toString()),
  });
  return {
    nextUrl: cloneableUrl,
    url: url.toString(),
    headers: new Headers(),
    ip: "127.0.0.1",
    geo: {},
    method: "GET",
  } as never;
}

describe("Legacy Route Blocking (Phase I)", () => {
  beforeEach(() => vi.clearAllMocks());

  const legacyRoutes = [
    "/board",
    "/marketplace",
    "/dashboard",
    "/gruppen",
    "/polls",
    "/companion",
    "/praevention",
    "/care/medications",
    "/care/sprechstunde",
    "/reports",
    "/mitessen",
    "/jugend",
  ];

  for (const route of legacyRoutes) {
    it(`blockiert ${route} und leitet auf /kreis-start um`, async () => {
      const res = await middleware(makeRequest(route));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/kreis-start");
    });
  }

  it("blockiert auch Sub-Routen wie /marketplace/123", async () => {
    const res = await middleware(makeRequest("/marketplace/123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/kreis-start");
  });

  const allowedRoutes = [
    "/mein-kreis",
    "/mein-kreis/termine",
    "/schreiben",
    "/hier-bei-mir",
    "/kreis-start",
    "/care",
    "/care/meine-senioren",
  ];

  for (const route of allowedRoutes) {
    it(`erlaubt Phase-1-Route ${route}`, async () => {
      const res = await middleware(makeRequest(route));
      // Sollte KEIN Redirect auf /kreis-start sein
      const location = res?.headers?.get("location") ?? "";
      expect(location).not.toContain("/kreis-start");
    });
  }
});
