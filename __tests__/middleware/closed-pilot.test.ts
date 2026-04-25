import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn().mockResolvedValue(new Response("ok")),
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
vi.mock("@/lib/feature-flags-middleware-cache", () => ({
  getCachedFlagEnabled: vi.fn().mockResolvedValue(false),
}));

import { proxy } from "@/proxy";

function makeRequest(pathname: string, method = "GET") {
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
    method,
  } as never;
}

describe("Closed-Pilot-Gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["/dashboard", "/kreis-start", "/marketplace"])(
    "leitet geschuetzte App-Seite %s auf die Closed-Pilot-Startseite",
    async (path) => {
      const res = await proxy(makeRequest(path));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost/");
      expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
    },
  );

  it.each(["/login", "/register", "/auth/callback", "/freigabe-ausstehend"])(
    "laesst Auth-/Freigabe-Seite %s erreichbar",
    async (path) => {
      const res = await proxy(makeRequest(path));

      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(503);
      expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
    },
  );

  it.each(["/api/messages", "/api/alerts"])(
    "blockiert personenbezogene API %s im Closed-Pilot-Modus",
    async (path) => {
      const res = await proxy(makeRequest(path, "POST"));
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/geschlossen|pilot/i);
      expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
    },
  );

  it.each(["/api/register/check-invite", "/api/register/complete"])(
    "laesst Registrierungs-API %s fuer Pending-Anmeldung durch",
    async (path) => {
      const res = await proxy(makeRequest(path, "POST"));

      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(503);
      expect(res.headers.get("location")).toBeNull();
    },
  );

  it.each(["/", "/datenschutz", "/impressum", "/agb"])(
    "laesst harmlose oeffentliche Seite %s erreichbar",
    async (path) => {
      const res = await proxy(makeRequest(path));

      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(503);
    },
  );
});
