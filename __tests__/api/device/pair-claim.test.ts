// __tests__/api/device/pair-claim.test.ts
// Welle B Task B4: API /api/device/pair/claim
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createPairingToken } from "@/lib/device-pairing/token";

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}));

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    set: mockRedisSet,
  }),
}));

async function buildReq(body: unknown) {
  return new NextRequest("http://localhost/api/device/pair/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function freshPairToken(): Promise<{ token: string; pair_id: string }> {
  const { token, payload } = await createPairingToken({ device_id: "dev-1" });
  return { token, pair_id: payload.pair_id };
}

describe("POST /api/device/pair/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEVICE_PAIRING_SECRET = "test-secret-32-bytes-1234567890abcdef";
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockRedisSet.mockResolvedValue("OK");
  });

  it("liefert 401 ohne Authentifizierung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { token } = await freshPairToken();
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({ pair_token: token, senior_user_id: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("liefert 400 wenn pair_token fehlt", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "c1" } } });
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({ senior_user_id: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("liefert 400 wenn senior_user_id fehlt", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "c1" } } });
    const { token } = await freshPairToken();
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({ pair_token: token });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("liefert 401 bei ungueltigem pair_token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "c1" } } });
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({
      pair_token: "garbage",
      senior_user_id: "s1",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("liefert 403 wenn kein caregiver_link existiert", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "c1" } } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { token } = await freshPairToken();
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({ pair_token: token, senior_user_id: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("liefert 200 + ack bei gueltiger Pair-Verbindung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "c1" } } });
    mockMaybeSingle.mockResolvedValue({
      data: { id: "link-1", resident_id: "s1", caregiver_id: "c1" },
      error: null,
    });
    const { token, pair_id } = await freshPairToken();
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({ pair_token: token, senior_user_id: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pair_id).toBe(pair_id);
    expect(body.senior_user_id).toBe("s1");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    // Kein refresh_token im Response (nur Senior-Geraet bekommt es via /status)
    expect(body.refresh_token).toBeUndefined();
  });

  it("speichert Hash (nicht Klartext) in device_refresh_tokens", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "c1" } } });
    mockMaybeSingle.mockResolvedValue({
      data: { id: "link-1", resident_id: "s1", caregiver_id: "c1" },
      error: null,
    });
    const { token } = await freshPairToken();
    const { POST } = await import("@/app/api/device/pair/claim/route");
    const req = await buildReq({ pair_token: token, senior_user_id: "s1" });
    await POST(req);
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBe("s1");
    expect(insertArg.pairing_method).toBe("qr");
    expect(insertArg.token_hash).toMatch(/^[0-9a-f]{64}$/);
    // Kein Klartext-Token gespeichert
    expect(JSON.stringify(insertArg)).not.toMatch(/"token":/);
  });
});
