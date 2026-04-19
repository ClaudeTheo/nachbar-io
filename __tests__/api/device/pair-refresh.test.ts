// __tests__/api/device/pair-refresh.test.ts
// Welle B Task B7: POST /api/device/pair/refresh - Token-Rotation
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashRefreshToken } from "@/lib/device-pairing/refresh-token";

const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdateEq = vi.fn();
const mockSelectEqEqGt = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: vi.fn((table: string) => {
      if (table !== "device_refresh_tokens") {
        throw new Error("unexpected table " + table);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              gt: vi.fn(() => ({
                maybeSingle: mockMaybeSingle,
              })),
            })),
          })),
        })),
        insert: mockInsert,
        update: vi.fn(() => ({
          eq: mockUpdateEq,
        })),
      };
    }),
  }),
}));

function buildReq(body: unknown) {
  return new NextRequest("http://localhost/api/device/pair/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/device/pair/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
    mockSelectEqEqGt.mockReset();
  });

  it("liefert 400 ohne refresh_token", async () => {
    const { POST } = await import("@/app/api/device/pair/refresh/route");
    const res = await POST(buildReq({}));
    expect(res.status).toBe(400);
  });

  it("liefert 401 wenn token nicht in DB", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { POST } = await import("@/app/api/device/pair/refresh/route");
    const res = await POST(buildReq({ refresh_token: "unknown-token" }));
    expect(res.status).toBe(401);
  });

  it("rotiert Token: neuer Token + altes Row revoked", async () => {
    const oldToken = "old-token-abcdef";
    const oldHash = hashRefreshToken(oldToken);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "row-1",
        user_id: "u-1",
        device_id: "dev-1",
        token_hash: oldHash,
        user_agent: "iOS",
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      },
      error: null,
    });
    const { POST } = await import("@/app/api/device/pair/refresh/route");
    const res = await POST(buildReq({ refresh_token: oldToken }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refresh_token).toMatch(/^[0-9a-f]{64}$/);
    expect(body.refresh_token).not.toBe(oldToken);
    expect(body.user_id).toBe("u-1");
    expect(body.expires_at).toBeDefined();

    // Neuer Insert mit Hash des neuen Tokens
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBe("u-1");
    expect(insertArg.device_id).toBe("dev-1");
    expect(insertArg.token_hash).toBe(hashRefreshToken(body.refresh_token));
    expect(insertArg.token_hash).not.toBe(oldHash);

    // Altes Row revoked
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "row-1");
  });
});
