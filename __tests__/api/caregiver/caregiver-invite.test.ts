// __tests__/api/caregiver/caregiver-invite.test.ts
// Tests fuer Caregiver Invite + Redeem API

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

// Mock fuer next/headers (cookies)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// Chainable Supabase-Query-Builder
function _createChainableMock(resolvedValue: {
  data: unknown;
  error: unknown;
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["from", "select", "insert", "update", "eq", "is", "single"];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // single() liefert das Ergebnis
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  // select() ohne single() liefert auch das Ergebnis (fuer zaehlen)
  chain.is = vi.fn().mockResolvedValue(resolvedValue);
  // insert().select().single() Kette
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  return chain;
}

let mockSupabase: ReturnType<typeof createMockSupabase>;
let mockUser: { id: string; email: string } | null;

function createMockSupabase() {
  // Speichere Antworten pro Tabelle
  const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
  // Zaehle Aufrufe pro Tabelle
  const tableCalls: Record<string, number> = {};

  const supabase = {
    auth: {
      getUser: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ data: { user: mockUser }, error: null }),
        ),
    },
    from: vi.fn().mockImplementation((table: string) => {
      tableCalls[table] = (tableCalls[table] ?? 0) + 1;
      const response = tableResponses[table] ?? { data: null, error: null };

      // Erstelle eine eigene Kette pro from()-Aufruf
      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(terminalResult);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
      // from().insert() (ohne select) soll auch resolven
      chain.then = terminalResult.then.bind(terminalResult);

      return chain;
    }),
    _setTableResponse(table: string, data: unknown, error: unknown = null) {
      tableResponses[table] = { data, error };
    },
    _getTableCalls(table: string) {
      return tableCalls[table] ?? 0;
    },
  };

  return supabase;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// --- Tests ---

describe("POST /api/caregiver/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-resident-1", email: "senior@test.de" };
    mockSupabase = createMockSupabase();
  });

  it("sollte einen 8-stelligen Invite-Code erstellen wenn < 10 aktive Links", async () => {
    // caregiver_links: 2 aktive Links
    mockSupabase._setTableResponse("caregiver_links", [
      { id: "1" },
      { id: "2" },
    ]);
    // caregiver_invites: Insert erfolgreich
    mockSupabase._setTableResponse("caregiver_invites", {
      invite_code: "ABCD1234",
      expires_at: "2026-03-16T12:00:00Z",
    });
    // care_audit_log: Insert erfolgreich
    mockSupabase._setTableResponse("care_audit_log", null);

    // Wir muessen die from()-Aufrufe differenzieren:
    // 0. care_subscriptions (Subscription-Gate) → Plus aktiv
    // 1. caregiver_links (zaehlen) → data: 2 Links
    // 2. caregiver_invites (insert) → data: { invite_code, expires_at }
    // 3. care_audit_log (insert) → OK
    const callResults: Array<{ data: unknown; error: unknown }> = [
      { data: { plan: "plus", status: "active" }, error: null }, // care_subscriptions
      { data: [{ id: "1" }, { id: "2" }], error: null }, // caregiver_links
      {
        data: { invite_code: "TESTCODE", expires_at: "2026-03-16T12:00:00Z" },
        error: null,
      }, // caregiver_invites
      { data: null, error: null }, // care_audit_log
    ];
    let callIndex = 0;

    mockSupabase.from = vi.fn().mockImplementation(() => {
      const response = callResults[callIndex] ?? { data: null, error: null };
      callIndex++;

      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(terminalResult);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);

      return chain;
    });

    const { POST } = await import("@/app/api/caregiver/invite/route");
    const request = new Request("http://localhost/api/caregiver/invite", {
      method: "POST",
    });
    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.code).toBe("TESTCODE");
    expect(json.expires_at).toBeDefined();
  });

  it("sollte 409 zurueckgeben wenn bereits 10 aktive Links bestehen", async () => {
    // Phase 1 Design-Doc 4.1: harter Cap 10 Personen im Vertrauenskreis
    const tenLinks = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
    }));

    const callResults: Array<{ data: unknown; error: unknown }> = [
      { data: { plan: "plus", status: "active" }, error: null }, // care_subscriptions
      { data: tenLinks, error: null }, // caregiver_links
    ];
    let callIndex = 0;

    mockSupabase.from = vi.fn().mockImplementation(() => {
      const response = callResults[callIndex] ?? {
        data: tenLinks,
        error: null,
      };
      callIndex++;
      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(terminalResult);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);

      return chain;
    });

    const { POST } = await import("@/app/api/caregiver/invite/route");
    const request = new Request("http://localhost/api/caregiver/invite", {
      method: "POST",
    });
    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toContain("Maximal 10");
  });

  it("sollte 401 zurueckgeben ohne Authentifizierung", async () => {
    mockUser = null;

    const { POST } = await import("@/app/api/caregiver/invite/route");
    const request = new Request("http://localhost/api/caregiver/invite", {
      method: "POST",
    });
    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toContain("authentifiziert");
  });
});
