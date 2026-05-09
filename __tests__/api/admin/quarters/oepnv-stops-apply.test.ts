// Welle I — Tests fuer POST /api/admin/quarters/[id]/oepnv-stops

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/info-hub/services/oepnv-stops-apply.service", () => ({
  applyOepnvStopsForQuarter: vi.fn(),
}));

import { POST } from "@/app/api/admin/quarters/[id]/oepnv-stops/route";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { applyOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-apply.service";

const createServerClientMock = vi.mocked(createServerClient);
const createServiceClientMock = vi.mocked(createServiceClient);
const applyMock = vi.mocked(applyOepnvStopsForQuarter);

function mockServerSupabase(opts: {
  userId?: string | null;
  role?: string | null;
}) {
  const userId = opts.userId ?? null;
  return {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: opts.role ? { role: opts.role } : null,
          })),
        })),
      })),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://sb.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/quarters/qid-1/oepnv-stops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/admin/quarters/[id]/oepnv-stops", () => {
  it("liefert 401, wenn nicht eingeloggt", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: null }) as any,
    );

    const res = await POST(
      makeRequest({ stops: [] }),
      makeContext("qid-1"),
    );
    expect(res.status).toBe(401);
  });

  it("liefert 403, wenn eingeloggt aber nicht super_admin", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "resident" }) as any,
    );

    const res = await POST(
      makeRequest({ stops: [] }),
      makeContext("qid-1"),
    );
    expect(res.status).toBe(403);
  });

  it("liefert 400, wenn body kein stops-Array enthaelt", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "super_admin" }) as any,
    );

    const res = await POST(
      makeRequest({ foo: "bar" }),
      makeContext("qid-1"),
    );
    expect(res.status).toBe(400);
  });

  it("liefert 200 + savedCount, wenn super_admin + valide Stops", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "super_admin" }) as any,
    );
    createServiceClientMock.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    applyMock.mockResolvedValueOnce({ savedCount: 2 });

    const res = await POST(
      makeRequest({
        stops: [
          { id: "1", name: "A" },
          { id: "2", name: "B" },
        ],
      }),
      makeContext("qid-1"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.savedCount).toBe(2);
    expect(applyMock).toHaveBeenCalledTimes(1);
    expect(applyMock.mock.calls[0][1]).toBe("qid-1");
    expect(applyMock.mock.calls[0][2]).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
  });

  it("liefert 500, wenn Service wirft", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "super_admin" }) as any,
    );
    createServiceClientMock.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    applyMock.mockRejectedValueOnce(new Error("DB exploded"));

    const res = await POST(
      makeRequest({ stops: [{ id: "1", name: "A" }] }),
      makeContext("qid-1"),
    );
    expect(res.status).toBe(500);
  });
});
