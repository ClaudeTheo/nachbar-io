// __tests__/api/caregiver/caregiver-redeem.test.ts
// Tests fuer Caregiver Redeem API (Code einloesen → Link erstellen)

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

let mockUser: { id: string; email: string } | null;

// Subscription-Ergebnis fuer Plus-Gate
const PLUS_SUB_RESULT = {
  data: { plan: "plus", status: "active" },
  error: null,
};

// Sequenzielle from()-Aufrufe mit unterschiedlichen Ergebnissen
// Subscription-Gate wird automatisch als erster Aufruf vorangestellt (wenn mockUser gesetzt)
function createMockSupabase(
  callResults: Array<{ data: unknown; error: unknown }>,
) {
  let callIndex = 0;
  // Subscription-Gate als ersten Aufruf voranstellen
  const allResults = [PLUS_SUB_RESULT, ...callResults];

  return {
    auth: {
      getUser: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ data: { user: mockUser }, error: null }),
        ),
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

let mockSupabase: ReturnType<typeof createMockSupabase>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Admin-Client Mock (fuer privilegierte Schreiboperationen in redeem.service.ts)
let mockAdminSupabase: ReturnType<typeof createMockSupabase>;

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn().mockImplementation(() => mockAdminSupabase),
}));

// --- Hilfsfunktion ---
function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/caregiver/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe("POST /api/caregiver/redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "caregiver-1", email: "tochter@test.de" };
  });

  it("loest gueltigen Code ein und erstellt Caregiver-Link", async () => {
    // supabase (User-Client): subscription check → invite read → resident name
    mockSupabase = createMockSupabase([
      // 1. caregiver_invites: Code gefunden (via supabase)
      {
        data: {
          id: "inv-1",
          resident_id: "senior-1",
          expires_at: "2099-12-31T23:59:59Z",
          used_at: null,
        },
        error: null,
      },
      // 2. users: Bewohner-Name (via supabase)
      { data: { display_name: "Frau Mueller" }, error: null },
      // 3. care_audit_log (via supabase)
      { data: null, error: null },
    ]);

    // adminDb: claim invite → create link (via getAdminSupabase)
    mockAdminSupabase = createMockSupabase([
      // 1. caregiver_invites: Update (claim) erfolgreich
      { data: { id: "inv-1" }, error: null },
      // 2. caregiver_links: Insert erfolgreich
      { data: null, error: null },
    ]);
    // Admin-Client hat kein auth — Subscription vorangestellt entfernen
    // Hack: Setze callIndex auf 1 um PLUS_SUB_RESULT zu ueberspringen
    // Besser: Erstelle Admin-Mock ohne Subscription-Prefix
    // Da createMockSupabase automatisch PLUS_SUB_RESULT voranstellt,
    // brauchen wir 2 Dummy-Aufrufe mehr. Stattdessen: einfacher Admin-Mock
    const adminCallResults = [
      { data: { id: "inv-1" }, error: null }, // claim invite
      { data: null, error: null }, // create link
    ];
    let adminCallIndex = 0;
    mockAdminSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn().mockImplementation(() => {
        const response = adminCallResults[adminCallIndex] ?? {
          data: null,
          error: null,
        };
        adminCallIndex++;
        const chain: Record<string, unknown> = {};
        const terminalResult = Promise.resolve(response);
        chain.select = vi.fn().mockReturnValue(chain);
        chain.insert = vi.fn().mockReturnValue(terminalResult);
        chain.update = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.is = vi.fn().mockReturnValue(chain);
        chain.gt = vi.fn().mockReturnValue(chain);
        chain.single = vi.fn().mockReturnValue(terminalResult);
        chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
        chain.then = terminalResult.then.bind(terminalResult);
        return chain;
      }),
    } as unknown as ReturnType<typeof createMockSupabase>;

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "ABCD1234", relationship_type: "child" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.resident_name).toBe("Frau Mueller");
    expect(json.resident_id).toBe("senior-1");
  });

  it("gibt 401 ohne Authentifizierung", async () => {
    mockUser = null;
    mockSupabase = createMockSupabase([]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "ABCD1234", relationship_type: "child" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toContain("authentifiziert");
  });

  it("gibt 400 bei fehlendem Code", async () => {
    mockSupabase = createMockSupabase([]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ relationship_type: "child" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Code");
  });

  it("gibt 400 bei ungueltigem Beziehungstyp", async () => {
    mockSupabase = createMockSupabase([]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "ABCD1234", relationship_type: "alien" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Beziehungstyp");
  });

  it("gibt 404 bei ungueltigem Code", async () => {
    mockSupabase = createMockSupabase([
      // caregiver_invites: nicht gefunden
      { data: null, error: { code: "PGRST116", message: "Not found" } },
    ]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "XXXXXXXX", relationship_type: "friend" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain("Ungültig");
  });

  it("gibt 403 bei Selbst-Einladung", async () => {
    mockSupabase = createMockSupabase([
      // caregiver_invites: Code gehoert dem gleichen User
      {
        data: {
          id: "inv-1",
          resident_id: "caregiver-1",
          expires_at: "2099-12-31T23:59:59Z",
          used_at: null,
        },
        error: null,
      },
    ]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "SELFCODE", relationship_type: "friend" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toContain("selbst");
  });

  it("gibt 409 bei bereits verwendetem Code", async () => {
    mockSupabase = createMockSupabase([
      // caregiver_invites: bereits benutzt
      {
        data: {
          id: "inv-1",
          resident_id: "senior-1",
          expires_at: "2099-12-31T23:59:59Z",
          used_at: "2026-03-14T10:00:00Z",
        },
        error: null,
      },
    ]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "USEDCODE", relationship_type: "child" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toContain("bereits");
  });

  it("gibt 410 bei abgelaufenem Code", async () => {
    mockSupabase = createMockSupabase([
      // caregiver_invites: abgelaufen
      {
        data: {
          id: "inv-1",
          resident_id: "senior-1",
          expires_at: "2020-01-01T00:00:00Z",
          used_at: null,
        },
        error: null,
      },
    ]);

    const { POST } = await import("@/app/api/caregiver/redeem/route");
    const response = await POST(
      makeRequest({ code: "EXPIRED1", relationship_type: "partner" }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toContain("abgelaufen");
  });
});
