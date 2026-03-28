import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase Server-Client mocken
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { loadQuarterContext } from "@/modules/voice/services/context-loader";
import { createClient } from "@/lib/supabase/server";

// Chainable Supabase-Mock (jede Methode gibt sich selbst zurueck, resolve am Ende)
function chainable(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = ["select", "eq", "in", "gte", "lte", "order", "limit", "not"];
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  // single() gibt Promise zurueck
  obj.single = vi.fn().mockResolvedValue(result);
  // Falls als Promise verwendet wird (await ohne .single()):
  // Wir muessen .then/.catch implementieren
  obj.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    return Promise.resolve(result).then(resolve, reject);
  };
  return obj;
}

// Supabase-Mock mit konfigurierbaren Tabellen-Antworten
function buildMockSupabase(
  overrides: Record<string, { data: unknown; error: unknown }> = {},
) {
  const tableResponses: Record<string, { data: unknown; error: unknown }> = {
    household_members: {
      data: { household: { quarter_id: "q-001" } },
      error: null,
    },
    quarters: {
      data: { name: "Oberer Rebberg" },
      error: null,
    },
    quarter_collection_areas: {
      data: [{ area_id: "area-1" }],
      error: null,
    },
    waste_collection_dates: {
      data: [
        { collection_date: "2026-03-25", waste_type: "Restmuell" },
        { collection_date: "2026-03-28", waste_type: "Gelber Sack" },
      ],
      error: null,
    },
    events: {
      data: [{ title: "Fruehlingsfest", event_date: "2026-04-01" }],
      error: null,
    },
    help_requests: {
      data: [{ title: "Parkplatz gesperrt", category: "board" }],
      error: null,
    },
    ...overrides,
  };

  return {
    from: vi.fn((table: string) => {
      const response = tableResponses[table] ?? { data: null, error: null };
      return chainable(response);
    }),
  };
}

describe("loadQuarterContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt korrektes QuarterContext-Objekt zurueck", async () => {
    const mock = buildMockSupabase();
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    const ctx = await loadQuarterContext("user-123");

    expect(ctx.quarterName).toBe("Oberer Rebberg");
    expect(ctx.wasteDate).toHaveLength(2);
    expect(ctx.wasteDate[0]).toEqual({ date: "2026-03-25", type: "Restmuell" });
    expect(ctx.events).toHaveLength(1);
    expect(ctx.events[0]).toEqual({
      title: "Fruehlingsfest",
      date: "2026-04-01",
    });
    expect(ctx.bulletinPosts).toHaveLength(1);
    expect(ctx.bulletinPosts[0]).toEqual({
      title: "Parkplatz gesperrt",
      category: "board",
    });
  });

  it("gibt Standardwerte zurueck wenn kein Haushalt gefunden", async () => {
    const mock = buildMockSupabase({
      household_members: { data: null, error: { message: "not found" } },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    const ctx = await loadQuarterContext("unknown-user");

    expect(ctx.quarterName).toBe("Unbekanntes Quartier");
    expect(ctx.wasteDate).toEqual([]);
    expect(ctx.events).toEqual([]);
    expect(ctx.bulletinPosts).toEqual([]);
  });

  it("gibt Standardwerte zurueck wenn createClient fehlschlaegt", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB-Fehler"),
    );

    const ctx = await loadQuarterContext("user-123");

    expect(ctx.quarterName).toBe("Unbekanntes Quartier");
    expect(ctx.wasteDate).toEqual([]);
    expect(ctx.events).toEqual([]);
    expect(ctx.bulletinPosts).toEqual([]);
  });

  it("verarbeitet leere Muelltermine korrekt", async () => {
    const mock = buildMockSupabase({
      waste_collection_dates: { data: [], error: null },
      quarter_collection_areas: { data: [], error: null },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    const ctx = await loadQuarterContext("user-123");

    expect(ctx.quarterName).toBe("Oberer Rebberg");
    expect(ctx.wasteDate).toEqual([]);
    // Events und Posts sollten trotzdem geladen werden
    expect(ctx.events).toHaveLength(1);
    expect(ctx.bulletinPosts).toHaveLength(1);
  });

  it("hat korrekte Rueckgabe-Struktur (QuarterContext Shape)", async () => {
    const mock = buildMockSupabase();
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    const ctx = await loadQuarterContext("user-123");

    // Typ-Pruefung: alle Felder vorhanden
    expect(ctx).toHaveProperty("quarterName");
    expect(ctx).toHaveProperty("wasteDate");
    expect(ctx).toHaveProperty("events");
    expect(ctx).toHaveProperty("bulletinPosts");
    expect(typeof ctx.quarterName).toBe("string");
    expect(Array.isArray(ctx.wasteDate)).toBe(true);
    expect(Array.isArray(ctx.events)).toBe(true);
    expect(Array.isArray(ctx.bulletinPosts)).toBe(true);
  });
});
