// __tests__/integration/device-pairing-flow.test.ts
// Welle B Task B8: End-to-End Integrationstest fuer den Pair-Flow
// (in-process gegen die echten Route-Handler, mit gemockten externen Systemen).
//
// Geprueftes Szenario:
//   1. Senior-Geraet ruft /pair/start    -> bekommt JWT pair_token
//   2. Senior pollt /pair/status         -> "pending"
//   3. Angehoeriger ruft /pair/claim    -> Hash in DB, Klartext in Redis
//   4. Senior pollt /pair/status erneut  -> "paired" + refresh_token
//   5. Senior ruft /pair/refresh         -> rotierter refresh_token
//
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashRefreshToken } from "@/lib/device-pairing/refresh-token";

// --- Mock-Layer ---

const redisStore = new Map<string, string>();
const fakeRedis = {
  get: vi.fn(async (k: string) => redisStore.get(k) ?? null),
  set: vi.fn(async (k: string, v: string, _opts?: { ex?: number }) => {
    redisStore.set(k, v);
    return "OK";
  }),
  del: vi.fn(async (k: string) => {
    const had = redisStore.delete(k) ? 1 : 0;
    return had;
  }),
};

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => fakeRedis,
}));

interface DbRow {
  id: string;
  user_id: string;
  device_id: string;
  token_hash: string;
  pairing_method: string;
  user_agent: string | null;
  expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}
const tokenRows: DbRow[] = [];
let nextRowId = 1;

const mockGetUser = vi.fn();
const mockCaregiverLink = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === "caregiver_links") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: mockCaregiverLink,
                })),
              })),
            })),
          })),
        };
      }
      throw new Error("unexpected user-client table " + table);
    }),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: vi.fn((table: string) => {
      if (table !== "device_refresh_tokens") {
        throw new Error("unexpected admin table " + table);
      }
      return {
        insert: vi.fn(
          async (row: Omit<DbRow, "id" | "revoked_at" | "revoked_reason">) => {
            tokenRows.push({
              id: `row-${nextRowId++}`,
              ...row,
              user_agent: row.user_agent ?? null,
              revoked_at: null,
              revoked_reason: null,
            });
            return { data: null, error: null };
          },
        ),
        select: vi.fn(() => ({
          eq: vi.fn((_col1: string, hash: string) => ({
            is: vi.fn(() => ({
              gt: vi.fn(() => ({
                maybeSingle: vi.fn(async () => {
                  const found = tokenRows.find(
                    (r) =>
                      r.token_hash === hash &&
                      r.revoked_at === null &&
                      new Date(r.expires_at).getTime() > Date.now(),
                  );
                  return { data: found ?? null, error: null };
                }),
              })),
            })),
          })),
        })),
        update: vi.fn((patch: Partial<DbRow>) => ({
          eq: vi.fn(async (_col: string, id: string) => {
            const r = tokenRows.find((x) => x.id === id);
            if (r) Object.assign(r, patch);
            return { data: null, error: null };
          }),
        })),
      };
    }),
  }),
}));

// --- Helper ---

function buildJsonReq(url: string, method: "GET" | "POST", body?: unknown) {
  const init: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
  } = {
    method,
  };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  redisStore.clear();
  tokenRows.length = 0;
  nextRowId = 1;
  process.env.DEVICE_PAIRING_SECRET =
    "integration-secret-32-bytes-1234567890abcdef";
});

describe("Device-Pairing E2E (in-process)", () => {
  it("durchlaeuft die volle Kette: start -> status pending -> claim -> status paired -> refresh", async () => {
    const startMod = await import("@/app/api/device/pair/start/route");
    const statusMod = await import("@/app/api/device/pair/status/route");
    const claimMod = await import("@/app/api/device/pair/claim/route");
    const refreshMod = await import("@/app/api/device/pair/refresh/route");

    // 1. Senior /pair/start
    const startReq = buildJsonReq("http://x/api/device/pair/start", "POST", {
      device_id: "dev-senior-1",
      user_agent: "Tauri/Win",
    });
    const startRes = await startMod.POST(startReq);
    expect(startRes.status).toBe(200);
    const startBody = await startRes.json();
    expect(startBody.token).toMatch(/^eyJ/);
    expect(startBody.pair_id).toBeDefined();
    const pairToken = startBody.token as string;

    // 2. Senior pollt /pair/status -> pending
    const pendingReq = buildJsonReq(
      `http://x/api/device/pair/status?pair_token=${encodeURIComponent(pairToken)}`,
      "GET",
    );
    const pendingRes = await statusMod.GET(pendingReq);
    expect(pendingRes.status).toBe(200);
    expect((await pendingRes.json()).status).toBe("pending");

    // 3. Caregiver /pair/claim
    mockGetUser.mockResolvedValue({ data: { user: { id: "c-1" } } });
    mockCaregiverLink.mockResolvedValue({
      data: {
        id: "link-1",
        resident_id: "u-senior",
        caregiver_id: "c-1",
      },
      error: null,
    });
    const claimReq = buildJsonReq("http://x/api/device/pair/claim", "POST", {
      pair_token: pairToken,
      senior_user_id: "u-senior",
    });
    const claimRes = await claimMod.POST(claimReq);
    expect(claimRes.status).toBe(200);
    const claimBody = await claimRes.json();
    expect(claimBody.ok).toBe(true);
    expect(claimBody.refresh_token).toBeUndefined();

    // DB hat genau einen Hash, kein Klartext
    expect(tokenRows.length).toBe(1);
    expect(tokenRows[0].user_id).toBe("u-senior");
    expect(tokenRows[0].pairing_method).toBe("qr");
    expect(tokenRows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);

    // 4. Senior pollt /pair/status -> paired + refresh_token
    const pairedReq = buildJsonReq(
      `http://x/api/device/pair/status?pair_token=${encodeURIComponent(pairToken)}`,
      "GET",
    );
    const pairedRes = await statusMod.GET(pairedReq);
    expect(pairedRes.status).toBe(200);
    const pairedBody = await pairedRes.json();
    expect(pairedBody.status).toBe("paired");
    expect(pairedBody.refresh_token).toMatch(/^[0-9a-f]{64}$/);
    expect(pairedBody.user_id).toBe("u-senior");
    expect(hashRefreshToken(pairedBody.refresh_token)).toBe(
      tokenRows[0].token_hash,
    );

    // 5. Sofortige zweite Status-Abfrage liefert wieder pending
    //    (One-Time-Pickup: Redis-Eintrag konsumiert)
    const repeatRes = await statusMod.GET(pairedReq);
    expect((await repeatRes.json()).status).toBe("pending");

    // 6. Senior ruft /pair/refresh -> neuer Token, alter revoked
    const seniorRefreshToken = pairedBody.refresh_token as string;
    const refreshReq = buildJsonReq(
      "http://x/api/device/pair/refresh",
      "POST",
      { refresh_token: seniorRefreshToken },
    );
    const refreshRes = await refreshMod.POST(refreshReq);
    expect(refreshRes.status).toBe(200);
    const refreshBody = await refreshRes.json();
    expect(refreshBody.refresh_token).toMatch(/^[0-9a-f]{64}$/);
    expect(refreshBody.refresh_token).not.toBe(seniorRefreshToken);
    expect(refreshBody.user_id).toBe("u-senior");

    // DB jetzt 2 Rows: alte revoked, neue aktiv
    expect(tokenRows.length).toBe(2);
    const oldRow = tokenRows.find(
      (r) => r.token_hash === hashRefreshToken(seniorRefreshToken),
    );
    const newRow = tokenRows.find(
      (r) => r.token_hash === hashRefreshToken(refreshBody.refresh_token),
    );
    expect(oldRow?.revoked_at).toBeTruthy();
    expect(oldRow?.revoked_reason).toBe("rotated");
    expect(newRow?.revoked_at).toBeNull();
    expect(newRow?.user_id).toBe("u-senior");
    expect(newRow?.device_id).toBe("dev-senior-1");

    // 7. Alter Token darf nicht erneut rotieren
    const replayRes = await refreshMod.POST(
      buildJsonReq("http://x/api/device/pair/refresh", "POST", {
        refresh_token: seniorRefreshToken,
      }),
    );
    expect(replayRes.status).toBe(401);
  });

  it("blockt Claim wenn caregiver_link fehlt", async () => {
    const startMod = await import("@/app/api/device/pair/start/route");
    const claimMod = await import("@/app/api/device/pair/claim/route");
    const startRes = await startMod.POST(
      buildJsonReq("http://x/api/device/pair/start", "POST", {
        device_id: "dev-2",
      }),
    );
    const { token } = await startRes.json();

    mockGetUser.mockResolvedValue({ data: { user: { id: "c-1" } } });
    mockCaregiverLink.mockResolvedValue({ data: null, error: null });

    const claimRes = await claimMod.POST(
      buildJsonReq("http://x/api/device/pair/claim", "POST", {
        pair_token: token,
        senior_user_id: "u-other",
      }),
    );
    expect(claimRes.status).toBe(403);
    expect(tokenRows.length).toBe(0);
  });
});
