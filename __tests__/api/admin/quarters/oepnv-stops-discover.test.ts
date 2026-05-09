// Welle H — Tests fuer /api/admin/quarters/[id]/oepnv-stops/discover

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/info-hub/services/oepnv-stops-discovery.service", () => ({
  discoverOepnvStopsForQuarter: vi.fn(),
}));

import { GET } from "@/app/api/admin/quarters/[id]/oepnv-stops/discover/route";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { discoverOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-discovery.service";

const createServerClientMock = vi.mocked(createServerClient);
const createServiceClientMock = vi.mocked(createServiceClient);
const discoverMock = vi.mocked(discoverOepnvStopsForQuarter);

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

function makeReq() {
  return new Request("http://localhost/api/admin/quarters/qid-1/oepnv-stops/discover");
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/admin/quarters/[id]/oepnv-stops/discover", () => {
  it("liefert 401, wenn nicht eingeloggt", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: null }) as any,
    );

    const res = await GET(makeReq(), makeContext("qid-1"));
    expect(res.status).toBe(401);
  });

  it("liefert 403, wenn eingeloggt aber nicht super_admin", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "resident" }) as any,
    );

    const res = await GET(makeReq(), makeContext("qid-1"));
    expect(res.status).toBe(403);
  });

  it("liefert 200 mit Stops, wenn super_admin", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "super_admin" }) as any,
    );
    createServiceClientMock.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    discoverMock.mockResolvedValueOnce({
      quarterId: "qid-1",
      quarterName: "Bad Saeckingen",
      centerLat: 47.55,
      centerLng: 7.95,
      stops: [
        {
          id: "8506566",
          name: "Bahnhof",
          lat: 47.5535,
          lng: 7.9532,
          type: "stop",
          distanceMeters: 0,
        },
      ],
      fetchedAt: "2026-05-09T20:00:00Z",
      errors: [],
    });

    const res = await GET(makeReq(), makeContext("qid-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quarterId).toBe("qid-1");
    expect(body.stops).toHaveLength(1);
    expect(body.stops[0].id).toBe("8506566");
    expect(discoverMock).toHaveBeenCalledTimes(1);
    expect(discoverMock.mock.calls[0][1]).toBe("qid-1");
  });

  it("respektiert Query-Param ?limit=10", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "super_admin" }) as any,
    );
    createServiceClientMock.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    discoverMock.mockResolvedValueOnce({
      quarterId: "qid-1",
      quarterName: "Bad Saeckingen",
      centerLat: 47.55,
      centerLng: 7.95,
      stops: [],
      fetchedAt: "2026-05-09T20:00:00Z",
      errors: [],
    });

    const req = new Request(
      "http://localhost/api/admin/quarters/qid-1/oepnv-stops/discover?limit=10",
    );
    await GET(req, makeContext("qid-1"));

    expect(discoverMock.mock.calls[0][2]).toMatchObject({ limit: 10 });
  });

  it("liefert 500 mit Fehler-Body, wenn Service wirft", async () => {
    createServerClientMock.mockResolvedValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockServerSupabase({ userId: "u-1", role: "super_admin" }) as any,
    );
    createServiceClientMock.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    discoverMock.mockRejectedValueOnce(new Error("Quartier missing"));

    const res = await GET(makeReq(), makeContext("qid-missing"));
    expect(res.status).toBe(500);
  });
});
