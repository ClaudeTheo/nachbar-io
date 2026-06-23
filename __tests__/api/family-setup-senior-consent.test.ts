import { describe, it, expect, vi, beforeEach } from "vitest";

// W5 / A2:4: POST /api/family-setup/senior/consent — Cookie-Auth, dann service_role-Service.
// seniorUserId kommt aus der Session (nicht aus dem Body) -> IDOR-sicher.

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

const adminSentinel = { __admin: true };
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => adminSentinel }));

const confirmSeniorConsentMock = vi.fn();
vi.mock("@/lib/family-setup/senior-consent.service", () => ({
  confirmSeniorConsent: (...args: unknown[]) => confirmSeniorConsentMock(...args),
}));

import { POST } from "@/app/api/family-setup/senior/consent/route";

const LINK = "33333333-3333-3333-3333-333333333333";

function makeRequest(body: unknown, raw?: string) {
  return new Request("http://localhost/api/family-setup/senior/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw !== undefined ? raw : JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe("POST /api/family-setup/senior/consent", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    confirmSeniorConsentMock.mockReset();
  });

  it("401 wenn nicht angemeldet", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ caregiverLinkId: LINK }));
    expect(res.status).toBe(401);
    expect(confirmSeniorConsentMock).not.toHaveBeenCalled();
  });

  it("400 bei fehlender/ungültiger caregiverLinkId (keine UUID)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    for (const bad of [{}, { caregiverLinkId: "nope" }, { caregiverLinkId: 1 }, { caregiverLinkId: null }]) {
      const res = await POST(makeRequest(bad));
      expect(res.status).toBe(400);
    }
    expect(confirmSeniorConsentMock).not.toHaveBeenCalled();
  });

  it("400 bei kaputtem JSON", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(makeRequest(undefined, "nicht-json{"));
    expect(res.status).toBe(400);
    expect(confirmSeniorConsentMock).not.toHaveBeenCalled();
  });

  it("200 bei gültiger UUID — Service bekommt admin + Session-userId (NICHT Body-id)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-session" } } });
    confirmSeniorConsentMock.mockResolvedValue({ consentStatus: "active" });
    const res = await POST(makeRequest({ caregiverLinkId: LINK, residentId: "u-attacker" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ consentStatus: "active" });
    expect(confirmSeniorConsentMock).toHaveBeenCalledWith(adminSentinel, "u-session", LINK);
  });
});
