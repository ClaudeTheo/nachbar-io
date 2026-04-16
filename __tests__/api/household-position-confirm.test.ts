import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/household/position/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createSelectChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("POST /api/household/position/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("gibt 401 ohne Login zurueck", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import(
      "@/app/api/household/position/confirm/route"
    );
    const response = await POST(createRequest({ lat: 47.56, lng: 7.94 }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Nicht angemeldet",
    });
  });

  it("gibt 400 fuer ungueltige Koordinaten zurueck", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { POST } = await import(
      "@/app/api/household/position/confirm/route"
    );
    const response = await POST(createRequest({ lat: null, lng: "abc" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Lat/Lng fehlen oder sind ungueltig.",
    });
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("faellt ohne Migrationsspalten sauber auf lat/lng-Update zurueck", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const updatePayloads: unknown[] = [];
    let householdUpdateCount = 0;

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "household_members") {
        return {
          select: vi.fn(() =>
            createSelectChain({
              data: { household_id: "hh-1" },
              error: null,
            }),
          ),
        };
      }

      if (table === "households") {
        return {
          select: vi.fn((query: string) => {
            if (query.includes("position_source")) {
              return createSelectChain({
                data: null,
                error: {
                  message: "column households.position_source does not exist",
                },
              });
            }

            return createSelectChain({
              data: {
                id: "hh-1",
                street_name: "Purkersdorfer Straße",
                house_number: "35",
                lat: 47.562469,
                lng: 7.947937,
                quarter_id: "q-1",
              },
              error: null,
            });
          }),
          update: vi.fn((payload: unknown) => {
            updatePayloads.push(payload);
            householdUpdateCount += 1;

            return {
              eq: vi.fn().mockResolvedValue({
                error:
                  householdUpdateCount === 1
                    ? {
                        message:
                          "column households.position_verified does not exist",
                      }
                    : null,
              }),
            };
          }),
        };
      }

      if (table === "quarters") {
        return {
          select: vi.fn(() =>
            createSelectChain({
              data: {
                city: "Bad Säckingen",
                postal_code: "79713",
              },
              error: null,
            }),
          ),
        };
      }

      throw new Error(`Unexpected table mock: ${table}`);
    });

    const { POST } = await import(
      "@/app/api/household/position/confirm/route"
    );
    const response = await POST(
      createRequest({
        lat: 47.5625,
        lng: 7.948,
        manualOverride: true,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      metadataSaved: false,
      manualOverride: true,
      confirmed: {
        lat: 47.5625,
        lng: 7.948,
      },
    });
    expect(updatePayloads).toHaveLength(2);
    expect(updatePayloads[0]).toMatchObject({
      position_verified: true,
      position_manual_override: true,
    });
    expect(updatePayloads[1]).toMatchObject({
      lat: 47.5625,
      lng: 7.948,
    });
  });
});
