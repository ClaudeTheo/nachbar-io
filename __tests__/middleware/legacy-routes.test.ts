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
import { updateSession } from "@/lib/supabase/middleware";

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

describe("Legacy Route Gate (2026-05-11 aufgeloest)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "false");
    mockGetCachedFlagEnabled.mockResolvedValue(false);
  });

  // Welle 3 (C1:6, Founder-Go 2026-06-22): Pilot-Positivliste kehrt die
  // 2026-05-11-Entscheidung um. Flag-lose, nicht-pilotreife Module sind wieder
  // verriegelt und werden SANFT auf /dashboard umgeleitet (nicht /kreis-start,
  // nicht 404). board/marketplace/events laufen ueber eigene Flag-Gates und
  // bleiben hier proxy-seitig erreichbar.
  const blockedRoutes = [
    "/lost-found",
    "/polls",
    "/leihboerse",
    "/whohas",
    "/mitessen",
    "/noise",
    "/tips",
    "/experts",
    "/packages",
  ];

  for (const route of blockedRoutes) {
    it(`leitet ${route} sanft auf /dashboard um`, async () => {
      const res = await proxy(makeRequest(route));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/dashboard");
      expect(res.headers.get("location")).not.toContain("/kreis-start");
    });
  }

  it("leitet auch Sub-Routen wie /leihboerse/123 um", async () => {
    const res = await proxy(makeRequest("/leihboerse/123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
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
    "/gruppen",
    "/hilfe",
    "/chat",
    "/board", // Flag-Gate (Welle 1), proxy-seitig erreichbar
    "/marketplace", // Flag-Gate (Welle 1)
    "/events", // Flag-Gate (events-layout)
    "/was-steht-uns-zu", // Leistungen-Info (LIVE)
  ];

  for (const route of allowedRoutes) {
    it(`erlaubt Pilot-Route ${route} (kein Legacy-Redirect)`, async () => {
      const res = await proxy(makeRequest(route));
      const location = res?.headers?.get("location") ?? "";
      // Weder auf /kreis-start (Health) noch auf /dashboard (Positivliste)
      expect(location).not.toContain("/kreis-start");
      expect(location).not.toContain("/dashboard");
    });
  }

  it("laesst Setup-Code-Seiten ohne Auth-Middleware erreichbar", async () => {
    const res = await proxy(makeRequest("/setup/example-token"));

    expect(updateSession).not.toHaveBeenCalled();
    expect(res.status).not.toBe(307);
  });
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
