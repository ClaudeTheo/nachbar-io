// __tests__/api/device/pair-status.test.ts
// Welle B Task B5: GET /api/device/pair/status (Senior pollt)
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createPairingToken } from "@/lib/device-pairing/token";

const mockRedisGet = vi.fn();
const mockRedisDel = vi.fn();

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: mockRedisGet,
    del: mockRedisDel,
  }),
}));

function buildReq(token?: string) {
  const url = token
    ? `http://localhost/api/device/pair/status?pair_token=${encodeURIComponent(token)}`
    : "http://localhost/api/device/pair/status";
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/device/pair/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEVICE_PAIRING_SECRET = "test-secret-32-bytes-1234567890abcdef";
    mockRedisDel.mockResolvedValue(1);
  });

  it("liefert 400 ohne pair_token", async () => {
    const { GET } = await import("@/app/api/device/pair/status/route");
    const res = await GET(buildReq());
    expect(res.status).toBe(400);
  });

  it("liefert 401 bei ungueltigem pair_token", async () => {
    const { GET } = await import("@/app/api/device/pair/status/route");
    const res = await GET(buildReq("garbage"));
    expect(res.status).toBe(401);
  });

  it("liefert pending wenn noch nicht geclaimed", async () => {
    mockRedisGet.mockResolvedValue(null);
    const { token } = await createPairingToken({ device_id: "dev-1" });
    const { GET } = await import("@/app/api/device/pair/status/route");
    const res = await GET(buildReq(token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.refresh_token).toBeUndefined();
  });

  it("liefert paired + refresh_token wenn geclaimed", async () => {
    const fakeData = {
      refresh_token: "abc123",
      user_id: "s1",
      device_id: "dev-1",
      expires_at: "2026-10-19T00:00:00.000Z",
      claimed_by: "c1",
    };
    // Upstash mit automaticDeserialization liefert das Objekt direkt zurueck
    mockRedisGet.mockResolvedValue(fakeData);
    const { token } = await createPairingToken({ device_id: "dev-1" });
    const { GET } = await import("@/app/api/device/pair/status/route");
    const res = await GET(buildReq(token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paired");
    expect(body.refresh_token).toBe("abc123");
    expect(body.user_id).toBe("s1");
    expect(body.expires_at).toBe("2026-10-19T00:00:00.000Z");
    // Konsumiert Redis-Eintrag (One-Time-Pickup)
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
  });

  it("akzeptiert auch JSON-String-Payload aus Redis", async () => {
    const obj = {
      refresh_token: "tok-x",
      user_id: "u-x",
      device_id: "dev-1",
      expires_at: "2026-10-19T00:00:00.000Z",
    };
    mockRedisGet.mockResolvedValue(JSON.stringify(obj));
    const { token } = await createPairingToken({ device_id: "dev-1" });
    const { GET } = await import("@/app/api/device/pair/status/route");
    const res = await GET(buildReq(token));
    const body = await res.json();
    expect(body.status).toBe("paired");
    expect(body.refresh_token).toBe("tok-x");
  });

  it("liefert 503 wenn Redis nicht verfuegbar", async () => {
    vi.resetModules();
    vi.doMock("@/lib/security/redis", () => ({
      getSecurityRedis: () => null,
    }));
    const { token } = await createPairingToken({ device_id: "dev-1" });
    const { GET } = await import("@/app/api/device/pair/status/route");
    const res = await GET(buildReq(token));
    expect(res.status).toBe(503);
    vi.doUnmock("@/lib/security/redis");
  });
});
