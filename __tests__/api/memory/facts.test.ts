import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetFacts = vi.fn();
const mockSaveFact = vi.fn();
const mockDeleteFact = vi.fn();

vi.mock("@/modules/memory/services/facts.service", () => ({
  getFacts: (...args: any[]) => mockGetFacts(...args),
  saveFact: (...args: any[]) => mockSaveFact(...args),
  deleteFact: (...args: any[]) => mockDeleteFact(...args),
  getFactCount: vi.fn().mockResolvedValue(5),
  validateMemorySave: vi.fn().mockReturnValue({ allowed: true, mode: "save" }),
}));

vi.mock("@/modules/memory/services/consent.service", () => ({
  hasConsent: vi.fn().mockResolvedValue(true),
}));

// Hilfs-Factory: liefert einen createClient-Mock, dessen auth.getUser
// den angegebenen User liefert und dessen from("caregiver_links")-Chain
// entweder einen aktiven Link zurueckgibt oder null.
function makeClientMock(
  opts: { userId?: string; caregiverLinkExists?: boolean } = {},
) {
  const userId = opts.userId ?? "user-1";
  const linkData = opts.caregiverLinkExists ? { id: "link-1" } : null;
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: linkData, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: linkData, error: null });
  return Promise.resolve({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn(() => chain),
  });
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => makeClientMock()),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

import { createClient } from "@/lib/supabase/server";
const mockedCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGetFacts.mockReset();
  mockSaveFact.mockReset();
  mockDeleteFact.mockReset();
  mockedCreateClient.mockImplementation(() => makeClientMock());
});

describe("Memory Facts API", () => {
  it("GET /api/memory/facts gibt Array zurueck", async () => {
    mockGetFacts.mockResolvedValue([
      { id: "1", category: "profile", key: "name", value: "Herr Mueller" },
    ]);

    const { GET } = await import("@/app/api/memory/facts/route");
    const response = await GET(
      new Request("http://localhost/api/memory/facts") as any,
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("POST /api/memory/facts speichert Fakt", async () => {
    mockSaveFact.mockResolvedValue({
      id: "2",
      category: "routine",
      key: "kaffee",
      value: "Kaffee um 8",
    });

    const { POST } = await import("@/app/api/memory/facts/route");
    const response = await POST(
      new Request("http://localhost/api/memory/facts", {
        method: "POST",
        body: JSON.stringify({
          category: "routine",
          key: "kaffee",
          value: "Kaffee um 8",
        }),
      }) as any,
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.key).toBe("kaffee");
  });
});

// ---------------------------------------------------------------------------
// GET /api/memory/facts — Caregiver-Cross-Read (C8)
// ---------------------------------------------------------------------------
// Ein Caregiver mit aktivem caregiver_link darf die Memory-Fakten eines
// verlinkten Seniors lesen: ?subject_user_id=<senior>. Ohne Link -> 403.

describe("Memory Facts API — Caregiver-Cross-Read (C8)", () => {
  const CAREGIVER_ID = "caregiver-1";
  const SENIOR_ID = "senior-1";

  it("GET mit subject_user_id + aktivem caregiver_link gibt Senior-Fakten zurueck", async () => {
    mockedCreateClient.mockImplementationOnce(() =>
      makeClientMock({ userId: CAREGIVER_ID, caregiverLinkExists: true }),
    );
    mockGetFacts.mockResolvedValue([
      { id: "f-1", category: "profile", key: "name", value: "Anna" },
    ]);

    const { GET } = await import("@/app/api/memory/facts/route");
    const response = await GET(
      new Request(
        `http://localhost/api/memory/facts?subject_user_id=${SENIOR_ID}`,
      ) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    // getFacts wurde mit der SENIOR-ID aufgerufen, nicht mit der Caregiver-ID
    expect(mockGetFacts).toHaveBeenCalledWith(
      expect.anything(),
      SENIOR_ID,
      undefined,
    );
  });

  it("GET mit subject_user_id ohne aktiven caregiver_link liefert 403 no_caregiver_link", async () => {
    mockedCreateClient.mockImplementationOnce(() =>
      makeClientMock({ userId: CAREGIVER_ID, caregiverLinkExists: false }),
    );

    const { GET } = await import("@/app/api/memory/facts/route");
    const response = await GET(
      new Request(
        `http://localhost/api/memory/facts?subject_user_id=${SENIOR_ID}`,
      ) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("no_caregiver_link");
    expect(mockGetFacts).not.toHaveBeenCalled();
  });

  it("GET ohne subject_user_id: weiterhin eigene Fakten (Senior-Pfad unveraendert)", async () => {
    mockGetFacts.mockResolvedValue([
      { id: "f-own", category: "profile", key: "name", value: "Herr Mueller" },
    ]);

    const { GET } = await import("@/app/api/memory/facts/route");
    const response = await GET(
      new Request("http://localhost/api/memory/facts") as any,
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(mockGetFacts).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      undefined,
    );
  });

  it("GET mit subject_user_id = eigene user.id: wie Senior-Pfad (kein Link-Check)", async () => {
    mockedCreateClient.mockImplementationOnce(() =>
      makeClientMock({ userId: "user-1", caregiverLinkExists: false }),
    );
    mockGetFacts.mockResolvedValue([]);

    const { GET } = await import("@/app/api/memory/facts/route");
    const response = await GET(
      new Request(
        "http://localhost/api/memory/facts?subject_user_id=user-1",
      ) as any,
    );

    expect(response.status).toBe(200);
    // Wichtig: kein Link-Check wenn subject_user_id === self, da RLS-Policy
    // "user_own_facts_select" bereits greift.
    expect(mockGetFacts).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      undefined,
    );
  });

  it("GET mit subject_user_id + category-Filter + aktivem Link weitergegeben", async () => {
    mockedCreateClient.mockImplementationOnce(() =>
      makeClientMock({ userId: CAREGIVER_ID, caregiverLinkExists: true }),
    );
    mockGetFacts.mockResolvedValue([]);

    const { GET } = await import("@/app/api/memory/facts/route");
    await GET(
      new Request(
        `http://localhost/api/memory/facts?subject_user_id=${SENIOR_ID}&category=care_need`,
      ) as any,
    );

    expect(mockGetFacts).toHaveBeenCalledWith(expect.anything(), SENIOR_ID, {
      category: "care_need",
    });
  });
});
