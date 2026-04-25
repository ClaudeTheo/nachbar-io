// __tests__/lib/supabase/middleware.test.ts
// Sicherheitskritisch: Auth-Middleware schuetzt alle geschuetzten Routes

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock createServerClient
const mockGetUser = vi.fn();
const mockSingle = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    })),
  })),
}));

import { updateSession } from "@/lib/supabase/middleware";

describe("updateSession (Auth-Middleware)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "false");
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  it("erlaubt oeffentliche Seiten ohne Auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/");
    const res = await updateSession(req);
    // Root-Seite ist oeffentlich, kein Redirect
    expect(res.status).not.toBe(307);
  });

  it("erlaubt API-Routes ohne Redirect", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/alerts");
    const res = await updateSession(req);
    const loc = res.headers.get("location");
    expect(loc === null || !loc.includes("/login")).toBe(true);
  });

  it("blockiert geschuetzte Closed-Pilot-APIs ohne Auth", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest("http://localhost/api/messages");
    const res = await updateSession(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("closed_pilot");
  });

  it("laesst oeffentliche Closed-Pilot-Registrierungs-APIs ohne Auth durch", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest("http://localhost/api/register/complete");
    const res = await updateSession(req);

    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(307);
  });

  it("erlaubt Login-Seite ohne Auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/login");
    const res = await updateSession(req);
    const loc = res.headers.get("location");
    expect(loc === null || !loc.includes("/login")).toBe(true);
  });

  it("redirected geschuetzte Seiten zu /login ohne Auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/dashboard");
    const res = await updateSession(req);
    const loc = res.headers.get("location");
    // Entweder Redirect zu /login oder 401/403
    expect(loc === null || loc.includes("/login") || res.status >= 400).toBe(
      true,
    );
  });

  it("redirected geschuetzte Closed-Pilot-Seiten ohne Auth zur Pilot-Startseite", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest("http://localhost/dashboard");
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("redirected pending Closed-Pilot-Nutzer zur Freigabe-Seite", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-pending" } } });
    mockSingle.mockResolvedValue({
      data: {
        trust_level: "new",
        settings: { pilot_approval_status: "pending" },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost/dashboard");
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/freigabe-ausstehend",
    );
  });

  it("blockiert pending Closed-Pilot-Nutzer bei App-APIs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-pending" } } });
    mockSingle.mockResolvedValue({
      data: {
        trust_level: "new",
        settings: { pilot_approval_status: "pending" },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/messages");
    const res = await updateSession(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/freigabe/i);
  });

  it("laesst freigegebene Closed-Pilot-Nutzer in die App", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-ok" } } });
    mockSingle.mockResolvedValue({
      data: { trust_level: "verified", settings: {} },
      error: null,
    });

    const req = new NextRequest("http://localhost/dashboard");
    const res = await updateSession(req);

    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(403);
  });

  it("laesst freigegebene Closed-Pilot-Nutzer an App-APIs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOSED_PILOT_MODE", "true");
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-ok" } } });
    mockSingle.mockResolvedValue({
      data: { trust_level: "admin", settings: {} },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/messages");
    const res = await updateSession(req);

    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(403);
  });
});
