// __tests__/api/housing/invitations.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const userClientFrom = vi.fn();
const adminFrom = vi.fn();
const mockCreateInvitation = vi.fn();
const mockConsumeInvitation = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: userClientFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: adminFrom,
  })),
}));

vi.mock("@/lib/housing/invitations", () => ({
  createHousingInvitation: (...a: unknown[]) => mockCreateInvitation(...a),
  consumeHousingInvitation: (...a: unknown[]) => mockConsumeInvitation(...a),
  INVITATION_EXPIRY_DAYS: 30,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// ============================================================
// POST /api/housing/invitations — Bewohner erstellt
// ============================================================
describe("POST /api/housing/invitations", () => {
  function householdLookup(data: unknown, error: unknown = null) {
    userClientFrom.mockImplementation((table: string) => {
      if (table === "household_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  }

  it("401 ohne Authentifizierung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/housing/invitations/route");
    const req = new Request("http://localhost/api/housing/invitations", {
      method: "POST",
      body: JSON.stringify({ expectedOrgName: "HV X", channel: "mailto" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);
  });

  it("400 bei fehlendem expectedOrgName", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    householdLookup({ household_id: "hh-1" });
    const { POST } = await import("@/app/api/housing/invitations/route");
    const req = new Request("http://localhost/api/housing/invitations", {
      method: "POST",
      body: JSON.stringify({ channel: "mailto" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("400 wenn User keinen Haushalt hat", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    householdLookup(null);
    const { POST } = await import("@/app/api/housing/invitations/route");
    const req = new Request("http://localhost/api/housing/invitations", {
      method: "POST",
      body: JSON.stringify({ expectedOrgName: "HV X", channel: "mailto" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/haushalt/i);
  });

  it("200 + Einladungs-Payload bei Erfolg", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    householdLookup({ household_id: "hh-1" });
    mockCreateInvitation.mockResolvedValue({
      token: "tok-xyz",
      code: "654321",
      expiresAt: "2026-05-20T00:00:00Z",
    });

    const { POST } = await import("@/app/api/housing/invitations/route");
    const req = new Request("http://localhost/api/housing/invitations", {
      method: "POST",
      body: JSON.stringify({
        expectedOrgName: "Hausverwaltung Mueller",
        expectedEmail: "info@mueller-hv.de",
        channel: "mailto",
      }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("tok-xyz");
    expect(body.code).toBe("654321");
    expect(body.magicLinkUrl).toContain("/einladung/tok-xyz");
    expect(mockCreateInvitation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        householdId: "hh-1",
        invitedByUserId: "u1",
        expectedOrgName: "Hausverwaltung Mueller",
        channel: "mailto",
      }),
    );
  });
});

// ============================================================
// POST /api/housing/invitations/consume — HV loest ein
// ============================================================
describe("POST /api/housing/invitations/consume", () => {
  it("401 ohne Authentifizierung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } =
      await import("@/app/api/housing/invitations/consume/route");
    const req = new Request(
      "http://localhost/api/housing/invitations/consume",
      {
        method: "POST",
        body: JSON.stringify({ token: "tok-abc" }),
      },
    );
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);
  });

  it("400 ohne token/code", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "hv-1" } } });
    const { POST } =
      await import("@/app/api/housing/invitations/consume/route");
    const req = new Request(
      "http://localhost/api/housing/invitations/consume",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("404 bei unbekanntem Token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "hv-1" } } });
    mockConsumeInvitation.mockRejectedValue(
      new Error("Einladung nicht gefunden oder abgelaufen"),
    );
    const { POST } =
      await import("@/app/api/housing/invitations/consume/route");
    const req = new Request(
      "http://localhost/api/housing/invitations/consume",
      {
        method: "POST",
        body: JSON.stringify({ token: "bad-token" }),
      },
    );
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(404);
  });

  it("200 + civicOrgId bei Erfolg", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "hv-1" } } });
    mockConsumeInvitation.mockResolvedValue({
      civicOrgId: "civic-org-new",
      householdId: "hh-1",
    });
    const { POST } =
      await import("@/app/api/housing/invitations/consume/route");
    const req = new Request(
      "http://localhost/api/housing/invitations/consume",
      {
        method: "POST",
        body: JSON.stringify({ token: "tok-abc" }),
      },
    );
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.civicOrgId).toBe("civic-org-new");
    expect(mockConsumeInvitation).toHaveBeenCalledWith(
      expect.anything(),
      "tok-abc",
      "hv-1",
    );
  });
});

// ============================================================
// GET /api/housing/invitations/[token]/info — public Landing-Info
// ============================================================
describe("GET /api/housing/invitations/[token]/info", () => {
  function invitationLookup(data: unknown, error: unknown = null) {
    adminFrom.mockImplementation((table: string) => {
      if (table === "housing_invitations") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  }

  it("404 bei unbekanntem Token", async () => {
    invitationLookup(null);
    const { GET } =
      await import("@/app/api/housing/invitations/[token]/info/route");
    const res = await GET(
      new Request(
        "http://localhost/api/housing/invitations/x/info",
      ) as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ token: "unknown" }) },
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "invitation_not_found",
    });
  });

  it("404 + generische Fehlermeldung bei PGRST116", async () => {
    invitationLookup(null, { code: "PGRST116", message: "not found" });
    const { GET } =
      await import("@/app/api/housing/invitations/[token]/info/route");
    const res = await GET(
      new Request(
        "http://localhost/api/housing/invitations/x/info",
      ) as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ token: "unknown" }) },
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "invitation_not_found",
    });
  });

  it("404 ohne interne Details bei Schema-Fehler", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    invitationLookup(null, {
      code: "PGRST205",
      message:
        "Could not find the table 'public.housing_invitations' in the schema cache",
    });
    const { GET } =
      await import("@/app/api/housing/invitations/[token]/info/route");
    const res = await GET(
      new Request(
        "http://localhost/api/housing/invitations/x/info",
      ) as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ token: "unknown" }) },
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "invitation_not_found" });
    expect(JSON.stringify(body)).not.toMatch(
      /housing_invitations|schema cache|public\./i,
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("200 + expectedOrgName + expiresAt bei Erfolg", async () => {
    invitationLookup({
      expected_org_name: "Hausverwaltung Mueller",
      expires_at: "2026-05-20T00:00:00Z",
    });
    const { GET } =
      await import("@/app/api/housing/invitations/[token]/info/route");
    const res = await GET(
      new Request(
        "http://localhost/api/housing/invitations/tok-abc/info",
      ) as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ token: "tok-abc" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expectedOrgName).toBe("Hausverwaltung Mueller");
    expect(body.expiresAt).toBe("2026-05-20T00:00:00Z");
  });
});
