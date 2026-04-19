// Tests fuer Phase I: Legacy-Route-Blocking + Gesundheits-Flag-Gate in Proxy.
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

const { mockGetCachedFlagEnabled } = vi.hoisted(() => ({
  mockGetCachedFlagEnabled: vi.fn(),
}));
vi.mock("@/lib/feature-flags-middleware-cache", () => ({
  getCachedFlagEnabled: mockGetCachedFlagEnabled,
}));

import { proxy } from "@/proxy";

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

describe("Legacy Route Blocking (Phase I, hart)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedFlagEnabled.mockResolvedValue(false);
  });

  const legacyRoutes = [
    "/board",
    "/marketplace",
    "/gruppen",
    "/polls",
    "/companion",
    "/praevention",
    "/reports",
    "/mitessen",
  ];

  for (const route of legacyRoutes) {
    it(`blockiert ${route} und leitet auf /kreis-start um`, async () => {
      const res = await proxy(makeRequest(route));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/kreis-start");
    });
  }

  it("blockiert auch Sub-Routen wie /marketplace/123", async () => {
    const res = await proxy(makeRequest("/marketplace/123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/kreis-start");
  });

  const allowedRoutes = [
    "/dashboard",
    "/mein-kreis",
    "/mein-kreis/termine",
    "/schreiben",
    "/hier-bei-mir",
    "/kreis-start",
    "/care",
    "/care/meine-senioren",
    "/jugend",
    "/admin",
  ];

  for (const route of allowedRoutes) {
    it(`erlaubt Phase-1-Route ${route}`, async () => {
      const res = await proxy(makeRequest(route));
      // Sollte KEIN Redirect auf /kreis-start sein
      const location = res?.headers?.get("location") ?? "";
      expect(location).not.toContain("/kreis-start");
    });
  }
});

describe("Gesundheits-Routes (flag-gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const healthRoutes = [
    { path: "/care/medications", flag: "MEDICATIONS_ENABLED" },
    { path: "/care/aerzte", flag: "DOCTORS_ENABLED" },
    { path: "/care/appointments", flag: "APPOINTMENTS_ENABLED" },
    { path: "/care/sprechstunde", flag: "VIDEO_CONSULTATION" },
    { path: "/care/consultations", flag: "VIDEO_CONSULTATION" },
    { path: "/care/heartbeat", flag: "HEARTBEAT_ENABLED" },
    { path: "/care/checkin", flag: "HEARTBEAT_ENABLED" },
    { path: "/arzt", flag: "GDT_ENABLED" },
  ];

  for (const { path, flag } of healthRoutes) {
    it(`${path}: Flag OFF -> Redirect auf /kreis-start`, async () => {
      mockGetCachedFlagEnabled.mockResolvedValue(false);
      const res = await proxy(makeRequest(path));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/kreis-start");
      expect(mockGetCachedFlagEnabled).toHaveBeenCalledWith(flag);
    });

    it(`${path}: Flag ON -> kein Redirect`, async () => {
      mockGetCachedFlagEnabled.mockResolvedValue(true);
      const res = await proxy(makeRequest(path));
      const location = res?.headers?.get("location") ?? "";
      expect(location).not.toContain("/kreis-start");
    });
  }

  it("Sub-Path /care/medications/42: Flag OFF -> Redirect", async () => {
    mockGetCachedFlagEnabled.mockResolvedValue(false);
    const res = await proxy(makeRequest("/care/medications/42"));
    expect(res.status).toBe(307);
  });
});
