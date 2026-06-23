import { describe, it, expect, vi, beforeEach } from "vitest";

// W4b-2: POST /api/profile/pilot-role — Cookie-Auth, dann service_role-Service.
// Sicherheit: userId kommt aus der Session (nicht aus dem Body) -> IDOR-sicher.
// Validierung auf {resident,caregiver,helper} (test_user verboten).

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

const adminSentinel = { __admin: true };
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => adminSentinel }));

const setPilotRoleServerMock = vi.fn();
vi.mock("@/lib/services/profile.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/profile.service")>();
  return {
    ...actual,
    setPilotRoleServer: (...args: unknown[]) => setPilotRoleServerMock(...args),
  };
});

import { POST } from "@/app/api/profile/pilot-role/route";

function makeRequest(body: unknown, raw?: string) {
  return new Request("http://localhost/api/profile/pilot-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw !== undefined ? raw : JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe("POST /api/profile/pilot-role", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    setPilotRoleServerMock.mockReset();
  });

  it("401 wenn nicht authentifiziert", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ pilotRole: "caregiver" }));
    expect(res.status).toBe(401);
    expect(setPilotRoleServerMock).not.toHaveBeenCalled();
  });

  it("400 bei test_user (keine erlaubte Selbst-Auswahl)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(makeRequest({ pilotRole: "test_user" }));
    expect(res.status).toBe(400);
    expect(setPilotRoleServerMock).not.toHaveBeenCalled();
  });

  it("400 bei unbekannter Rolle", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(makeRequest({ pilotRole: "admin" }));
    expect(res.status).toBe(400);
    expect(setPilotRoleServerMock).not.toHaveBeenCalled();
  });

  it("400 bei kaputtem JSON", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(makeRequest(undefined, "nicht-json{"));
    expect(res.status).toBe(400);
    expect(setPilotRoleServerMock).not.toHaveBeenCalled();
  });

  // Defensive-Depth: nicht-String-Payloads (Array/Objekt/null) und Prototype-Pollution
  // muessen am String-Type-Guard scheitern (kein Service-Aufruf).
  it.each([
    ["Array", { pilotRole: ["resident"] }],
    ["Objekt", { pilotRole: { value: "resident" } }],
    ["null", { pilotRole: null }],
    ["Zahl", { pilotRole: 1 }],
    ["fehlend", {}],
    ["__proto__-Injection", JSON.parse('{"pilotRole":{"__proto__":{"x":1}}}')],
  ])("400 bei nicht-erlaubtem Payload (%s)", async (_label, payload) => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(400);
    expect(setPilotRoleServerMock).not.toHaveBeenCalled();
  });

  it("200 bei gueltiger Rolle — Service bekommt admin + Session-userId (NICHT Body-id)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-session" } } });
    setPilotRoleServerMock.mockResolvedValue("caregiver");
    const res = await POST(makeRequest({ pilotRole: "caregiver", userId: "u-attacker" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ pilotRole: "caregiver" });
    expect(setPilotRoleServerMock).toHaveBeenCalledWith(adminSentinel, "u-session", "caregiver");
  });
});
