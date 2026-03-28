// __tests__/api/caregiver/caregiver-links.test.ts
// Tests fuer Caregiver-Links API (GET + PATCH)

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

let mockUser: { id: string; email: string } | null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

let mockSupabase: Record<string, unknown>;

// Subscription-Ergebnis fuer Plus-Gate (wird als erster from()-Aufruf benoetigt)
const PLUS_SUB_RESULT = {
  data: { plan: "plus", status: "active" },
  error: null,
};

function createLinksGetMock(asResident: unknown[], asCaregiver: unknown[]) {
  let callIndex = 0;
  const results = [
    PLUS_SUB_RESULT, // care_subscriptions (Subscription-Gate)
    { data: asResident, error: null },
    { data: asCaregiver, error: null },
  ];

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: vi.fn().mockImplementation(() => {
      const response = results[callIndex] ?? { data: [], error: null };
      callIndex++;

      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(terminalResult);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
      chain.then = terminalResult.then.bind(terminalResult);

      return chain;
    }),
  };
}

function createLinksPatchMock(
  callResults: Array<{ data: unknown; error: unknown }>,
) {
  let callIndex = 0;
  // Subscription-Gate als ersten Aufruf voranstellen
  const allResults = [PLUS_SUB_RESULT, ...callResults];

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: vi.fn().mockImplementation(() => {
      const response = allResults[callIndex] ?? { data: null, error: null };
      callIndex++;

      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(terminalResult);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
      chain.then = terminalResult.then.bind(terminalResult);

      return chain;
    }),
  };
}

// --- GET Tests ---

describe("GET /api/caregiver/links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1", email: "test@test.de" };
  });

  it("gibt Links als Bewohner und Caregiver zurueck", async () => {
    const residentLinks = [
      {
        id: "link-1",
        caregiver_id: "cg-1",
        relationship_type: "child",
        heartbeat_visible: true,
        revoked_at: null,
      },
    ];
    const caregiverLinks = [
      {
        id: "link-2",
        resident_id: "sr-1",
        relationship_type: "friend",
        heartbeat_visible: false,
      },
    ];

    mockSupabase = createLinksGetMock(residentLinks, caregiverLinks);

    const { GET } = await import("@/app/api/caregiver/links/route");
    const request = new Request("http://localhost/api/caregiver/links");
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.as_resident).toHaveLength(1);
    expect(json.as_caregiver).toHaveLength(1);
    expect(json.as_resident[0].relationship_type).toBe("child");
    expect(json.as_caregiver[0].relationship_type).toBe("friend");
  });

  it("gibt leere Listen zurueck wenn keine Links vorhanden", async () => {
    mockSupabase = createLinksGetMock([], []);

    const { GET } = await import("@/app/api/caregiver/links/route");
    const request = new Request("http://localhost/api/caregiver/links");
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.as_resident).toEqual([]);
    expect(json.as_caregiver).toEqual([]);
  });

  it("gibt 401 ohne Authentifizierung", async () => {
    mockUser = null;
    mockSupabase = createLinksGetMock([], []);

    const { GET } = await import("@/app/api/caregiver/links/route");
    const request = new Request("http://localhost/api/caregiver/links");
    const response = await GET(request as never);

    expect(response.status).toBe(401);
  });
});

// --- PATCH Tests ---

describe("PATCH /api/caregiver/links/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "resident-1", email: "senior@test.de" };
  });

  it("widerruft einen Caregiver-Link", async () => {
    mockSupabase = createLinksPatchMock([
      // 1. Link finden
      {
        data: { id: "link-1", resident_id: "resident-1", caregiver_id: "cg-1" },
        error: null,
      },
      // 2. Audit-Log
      { data: null, error: null },
      // 3. Update
      { data: null, error: null },
    ]);

    const { PATCH } = await import("@/app/api/caregiver/links/[id]/route");
    const request = new Request("http://localhost/api/caregiver/links/link-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: true }),
    });
    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "link-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("togglet Heartbeat-Sichtbarkeit", async () => {
    mockSupabase = createLinksPatchMock([
      // 1. Link finden
      {
        data: { id: "link-1", resident_id: "resident-1", caregiver_id: "cg-1" },
        error: null,
      },
      // 2. Audit-Log
      { data: null, error: null },
      // 3. Update
      { data: null, error: null },
    ]);

    const { PATCH } = await import("@/app/api/caregiver/links/[id]/route");
    const request = new Request("http://localhost/api/caregiver/links/link-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heartbeat_visible: true }),
    });
    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "link-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("gibt 404 wenn Link nicht dem Bewohner gehoert", async () => {
    mockSupabase = createLinksPatchMock([
      // Link nicht gefunden (gehoert anderem User)
      { data: null, error: { code: "PGRST116", message: "Not found" } },
    ]);

    const { PATCH } = await import("@/app/api/caregiver/links/[id]/route");
    const request = new Request(
      "http://localhost/api/caregiver/links/link-99",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: true }),
      },
    );
    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "link-99" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain("nicht gefunden");
  });

  it("gibt 400 bei leerer Aenderung", async () => {
    mockSupabase = createLinksPatchMock([
      // 1. Link finden
      {
        data: { id: "link-1", resident_id: "resident-1", caregiver_id: "cg-1" },
        error: null,
      },
    ]);

    const { PATCH } = await import("@/app/api/caregiver/links/[id]/route");
    const request = new Request("http://localhost/api/caregiver/links/link-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "link-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Keine Änderungen");
  });

  it("gibt 401 ohne Authentifizierung", async () => {
    mockUser = null;
    mockSupabase = createLinksPatchMock([]);

    const { PATCH } = await import("@/app/api/caregiver/links/[id]/route");
    const request = new Request("http://localhost/api/caregiver/links/link-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: true }),
    });
    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "link-1" }),
    });

    expect(response.status).toBe(401);
  });
});
