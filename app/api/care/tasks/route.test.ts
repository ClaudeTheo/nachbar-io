// app/api/care/tasks/route.test.ts
// Nachbar.io — Tests fuer Aufgaben API-Route (GET + POST)
// Testet: Auth, Subscription-Gate, Validierung, Kategorie, Urgency, Quartier-Zuordnung

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// --- Mocks ---
const mockUser = { id: "user-1", email: "test@test.de" };
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () =>
    NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Proxy-basierter Supabase-Mock
const mockTasks = [
  { id: "task-1", title: "Einkaufen", category: "shopping", status: "open" },
  { id: "task-2", title: "Gartenarbeit", category: "garden", status: "open" },
];

function createChainProxy(resolveValue: {
  data: unknown;
  error: unknown;
}): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          Promise.resolve(resolveValue).then(resolve, reject);
      }
      // single() gibt ein Promise zurueck
      if (prop === "single") {
        return () => Promise.resolve(resolveValue);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockInsertResult = {
  data: { id: "task-new", title: "Neue Aufgabe", category: "other" },
  error: null,
};
const mockHouseholdResult = {
  data: { household: { quarter_id: "q-1" } },
  error: null,
};

// Merke: mockHouseholdSingle muss pro Test ueberschreibbar sein
const _mockHouseholdSingle = vi.fn().mockResolvedValue(mockHouseholdResult);

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === "care_tasks") {
    return {
      select: () => createChainProxy({ data: mockTasks, error: null }),
      insert: () => ({
        select: () => ({ single: vi.fn().mockResolvedValue(mockInsertResult) }),
      }),
    };
  }
  if (table === "household_members") {
    return {
      select: () => createChainProxy({ data: null, error: null }),
      // Proxy-Chain mit single() am Ende → household-Lookup
      ...(() => {
        const proxy = createChainProxy(mockHouseholdResult);
        return { select: () => proxy };
      })(),
    };
  }
  return { select: () => createChainProxy({ data: null, error: null }) };
});

const mockSupabase = { from: mockFrom, auth: { getUser: vi.fn() } };

import { GET, POST } from "./route";

// --- Helpers ---
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/care/tasks");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/care/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/care/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
    });
    mockRequireSubscription.mockResolvedValue(true);
  });

  it("gibt 401 wenn nicht authentifiziert", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it("prueft Subscription-Gate (Plus erforderlich)", async () => {
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: "Plus erforderlich" }, { status: 403 }),
    );
    const res = await GET(createGetRequest());
    expect(res.status).toBe(403);
  });

  it("laedt offene Aufgaben (Standard)", async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
  });

  it("weist ungueltige Kategorie ab", async () => {
    const res = await GET(createGetRequest({ category: "ungueltig" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Ungueltige Kategorie");
  });

  it("akzeptiert gueltige Kategorien", async () => {
    for (const cat of [
      "transport",
      "shopping",
      "companionship",
      "garden",
      "tech_help",
      "pet_care",
      "household",
      "other",
    ]) {
      mockRequireAuth.mockResolvedValue({
        supabase: mockSupabase,
        user: mockUser,
      });
      mockRequireSubscription.mockResolvedValue(true);
      const res = await GET(createGetRequest({ category: cat }));
      expect(res.status).toBe(200);
    }
  });
});

describe("POST /api/care/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
    });
    mockRequireSubscription.mockResolvedValue(true);
  });

  it("gibt 401 wenn nicht authentifiziert", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await POST(createPostRequest({ title: "Test" }));
    expect(res.status).toBe(401);
  });

  it("weist fehlenden Titel ab", async () => {
    const res = await POST(createPostRequest({ description: "Ohne Titel" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Titel");
  });

  it("weist zu kurzen Titel ab (< 3 Zeichen)", async () => {
    const res = await POST(createPostRequest({ title: "AB" }));
    expect(res.status).toBe(400);
  });

  it("weist zu langen Titel ab (> 200 Zeichen)", async () => {
    const res = await POST(createPostRequest({ title: "A".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("weist zu lange Beschreibung ab (> 1000 Zeichen)", async () => {
    const res = await POST(
      createPostRequest({ title: "Test", description: "B".repeat(1001) }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("1000 Zeichen");
  });

  it("weist ungueltige Kategorie ab", async () => {
    const res = await POST(
      createPostRequest({ title: "Test", category: "flugzeug" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Ungueltige Kategorie");
  });

  it("weist ungueltige Dringlichkeit ab", async () => {
    const res = await POST(
      createPostRequest({ title: "Test", urgency: "sofort_bitte" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Ungueltige Dringlichkeit");
  });

  it("akzeptiert gueltige Dringlichkeitsstufen", async () => {
    for (const urg of ["low", "normal", "high", "urgent"]) {
      mockRequireAuth.mockResolvedValue({
        supabase: mockSupabase,
        user: mockUser,
      });
      mockRequireSubscription.mockResolvedValue(true);
      const res = await POST(
        createPostRequest({ title: "Testaufgabe", urgency: urg }),
      );
      expect(res.status).toBe(201);
    }
  });

  it("erstellt Aufgabe mit Standardwerten", async () => {
    const res = await POST(createPostRequest({ title: "Einkaufen gehen" }));
    expect(res.status).toBe(201);
  });

  it("gibt 403 wenn User keinem Quartier zugeordnet", async () => {
    // Ueberschreibe mockFrom fuer diesen Test: household_members liefert Fehler
    mockFrom.mockImplementationOnce((table: string) => {
      if (table === "household_members") {
        return {
          select: () =>
            createChainProxy({ data: null, error: { message: "Not found" } }),
        };
      }
      return { select: () => createChainProxy({ data: null, error: null }) };
    });

    const res = await POST(createPostRequest({ title: "Test" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("keinem Quartier");
  });

  it("weist ungueltiges JSON ab", async () => {
    const req = new NextRequest("http://localhost:3000/api/care/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "kein-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
