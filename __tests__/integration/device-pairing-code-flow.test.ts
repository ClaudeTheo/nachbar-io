// __tests__/integration/device-pairing-code-flow.test.ts
// Welle B Folgearbeit: End-to-End in-process Code-Pairing-Flow.
// caregiver -> start-code -> Code in Redis -> senior -> claim-by-code -> refresh_token
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockAdminInsert = vi.fn();

const redisStore = new Map<string, string>();
const redisCounters = new Map<string, number>();

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
      insert: mockAdminInsert,
    })),
  }),
}));

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: async <T = unknown>(k: string): Promise<T | null> =>
      (redisStore.get(k) as T | undefined) ?? null,
    set: async (
      k: string,
      v: string,
      _opts?: { ex?: number },
    ): Promise<"OK"> => {
      redisStore.set(k, v);
      return "OK";
    },
    del: async (k: string): Promise<number> => {
      redisStore.delete(k);
      return 1;
    },
    incr: async (k: string): Promise<number> => {
      const n = (redisCounters.get(k) ?? 0) + 1;
      redisCounters.set(k, n);
      return n;
    },
    expire: async (): Promise<boolean> => true,
  }),
}));

describe("device-pairing code flow (E2E in-process)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
    redisCounters.clear();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-care" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "link-1" } });
    mockAdminInsert.mockResolvedValue({ error: null });
  });

  it("Happy-Path: caregiver erzeugt Code, senior claimt ihn, refresh_token zurueck", async () => {
    const { POST: start } =
      await import("@/app/api/device/pair/start-code/route");
    const { POST: claim } =
      await import("@/app/api/device/pair/claim-by-code/route");

    // 1. Caregiver: Code anfordern
    const r1 = await start(
      new NextRequest("http://x/api/device/pair/start-code", {
        method: "POST",
        body: JSON.stringify({ senior_user_id: "u-senior" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(r1.status).toBe(200);
    const j1 = (await r1.json()) as { code: string };
    expect(j1.code).toMatch(/^\d{6}$/);

    // Redis sollte Code halten
    expect(redisStore.has(`pair-code:${j1.code}`)).toBe(true);

    // 2. Senior: Code claimen
    const r2 = await claim(
      new NextRequest("http://x/api/device/pair/claim-by-code", {
        method: "POST",
        body: JSON.stringify({ code: j1.code, device_id: "d-senior-1" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "9.9.9.9",
        },
      }),
    );
    expect(r2.status).toBe(200);
    const j2 = (await r2.json()) as { refresh_token: string; user_id: string };
    expect(j2.user_id).toBe("u-senior");
    expect(j2.refresh_token).toMatch(/^[0-9a-f]{64}$/);

    // Nach erfolgreichem Claim: Code ist aus Redis verschwunden (single-use)
    expect(redisStore.has(`pair-code:${j1.code}`)).toBe(false);

    // Admin-Insert wurde mit pairing_method 'code' aufgerufen
    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
    const ins = mockAdminInsert.mock.calls[0][0];
    expect(ins.pairing_method).toBe("code");
    expect(ins.user_id).toBe("u-senior");
  });

  it("Replay: zweiter Claim desselben Codes ist 401", async () => {
    const { POST: start } =
      await import("@/app/api/device/pair/start-code/route");
    const { POST: claim } =
      await import("@/app/api/device/pair/claim-by-code/route");

    const r1 = await start(
      new NextRequest("http://x/start", {
        method: "POST",
        body: JSON.stringify({ senior_user_id: "u-senior" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const { code } = (await r1.json()) as { code: string };

    // Erster Claim OK
    const c1 = await claim(
      new NextRequest("http://x/claim", {
        method: "POST",
        body: JSON.stringify({ code, device_id: "d-1" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "1.1.1.1",
        },
      }),
    );
    expect(c1.status).toBe(200);

    // Zweiter Claim mit gleichem Code: 401 (Code wurde geloescht)
    const c2 = await claim(
      new NextRequest("http://x/claim", {
        method: "POST",
        body: JSON.stringify({ code, device_id: "d-2" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "2.2.2.2",
        },
      }),
    );
    expect(c2.status).toBe(401);
  });
});
