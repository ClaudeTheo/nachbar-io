// __tests__/api/device/pair-claim-by-code.test.ts
// Welle B Folgearbeit: API /api/device/pair/claim-by-code
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRedisGet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisIncr = vi.fn();
const mockRedisExpire = vi.fn();
const mockAdminInsert = vi.fn();

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: mockRedisGet,
    del: mockRedisDel,
    incr: mockRedisIncr,
    expire: mockRedisExpire,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: vi.fn(() => ({
      insert: mockAdminInsert,
    })),
  }),
}));

function buildReq(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/device/pair/claim-by-code", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/device/pair/claim-by-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(true);
    mockAdminInsert.mockResolvedValue({ error: null });
  });

  it("400 wenn code fehlt", async () => {
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ device_id: "d-1" }));
    expect(res.status).toBe(400);
  });

  it("400 wenn device_id fehlt", async () => {
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ code: "123456" }));
    expect(res.status).toBe(400);
  });

  it("400 wenn Code-Format falsch (nicht 6 Ziffern)", async () => {
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ code: "abc123", device_id: "d-1" }));
    expect(res.status).toBe(400);
  });

  it("401 wenn Code nicht in Redis (abgelaufen/falsch)", async () => {
    mockRedisGet.mockResolvedValue(null);
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ code: "123456", device_id: "d-1" }));
    expect(res.status).toBe(401);
  });

  it("200 + refresh_token + Redis DEL bei Happy Path", async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        senior_user_id: "u-senior",
        caregiver_id: "u-care",
        created_at: new Date().toISOString(),
      }),
    );
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ code: "123456", device_id: "d-1" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      refresh_token: string;
      user_id: string;
      device_id: string;
      expires_at: string;
    };
    expect(json.refresh_token).toMatch(/^[0-9a-f]{64}$/);
    expect(json.user_id).toBe("u-senior");
    expect(json.device_id).toBe("d-1");
    expect(typeof json.expires_at).toBe("string");

    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
    const insertCall = mockAdminInsert.mock.calls[0][0];
    expect(insertCall.user_id).toBe("u-senior");
    expect(insertCall.pairing_method).toBe("code");
    expect(insertCall.token_hash).toMatch(/^[0-9a-f]{64}$/);

    expect(mockRedisDel).toHaveBeenCalledWith("pair-code:123456");
  });

  it("429 nach 5 Fehlversuchen (Rate-Limit)", async () => {
    mockRedisIncr.mockResolvedValue(6);
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ code: "999999", device_id: "d-1" }));
    expect(res.status).toBe(429);
  });

  it("503 wenn Redis nicht verfuegbar", async () => {
    vi.resetModules();
    vi.doMock("@/lib/security/redis", () => ({
      getSecurityRedis: () => null,
    }));
    const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
    const res = await POST(buildReq({ code: "123456", device_id: "d-1" }));
    expect(res.status).toBe(503);
    vi.doUnmock("@/lib/security/redis");
  });
});
