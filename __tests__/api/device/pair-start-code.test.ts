// __tests__/api/device/pair-start-code.test.ts
// Welle B Folgearbeit: API /api/device/pair/start-code
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
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

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    set: mockRedisSet,
  }),
}));

async function buildReq(body: unknown) {
  return new NextRequest("http://localhost/api/device/pair/start-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/device/pair/start-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 wenn nicht eingeloggt", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/device/pair/start-code/route");
    const res = await POST(await buildReq({ senior_user_id: "u-senior" }));
    expect(res.status).toBe(401);
  });

  it("400 wenn senior_user_id fehlt", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-care" } } });
    const { POST } = await import("@/app/api/device/pair/start-code/route");
    const res = await POST(await buildReq({}));
    expect(res.status).toBe(400);
  });

  it("400 wenn senior_user_id kein string", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-care" } } });
    const { POST } = await import("@/app/api/device/pair/start-code/route");
    const res = await POST(await buildReq({ senior_user_id: 12345 }));
    expect(res.status).toBe(400);
  });

  it("403 wenn kein aktiver caregiver_link", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-care" } } });
    mockMaybeSingle.mockResolvedValue({ data: null });
    const { POST } = await import("@/app/api/device/pair/start-code/route");
    const res = await POST(await buildReq({ senior_user_id: "u-senior" }));
    expect(res.status).toBe(403);
  });

  it("200 + 6-stelliger Code + Redis-Eintrag bei Happy Path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-care" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "link-1" } });
    mockRedisSet.mockResolvedValue("OK");

    const { POST } = await import("@/app/api/device/pair/start-code/route");
    const res = await POST(await buildReq({ senior_user_id: "u-senior" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; expires_in: number };
    expect(json.code).toMatch(/^\d{6}$/);
    expect(json.expires_in).toBe(600);

    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    const [key, value, opts] = mockRedisSet.mock.calls[0];
    expect(key).toBe(`pair-code:${json.code}`);
    const payload = JSON.parse(value as string);
    expect(payload).toMatchObject({
      senior_user_id: "u-senior",
      caregiver_id: "u-care",
    });
    expect(typeof payload.created_at).toBe("string");
    expect(opts).toEqual({ ex: 600 });
  });
});
