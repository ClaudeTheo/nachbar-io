// Tests fuer den Circle-Events-Service (Termine im Familienkreis)
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCircleEvent,
  listUpcoming,
  markAsDone,
} from "../circle-events.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Hilfsfunktion: Mock-Supabase mit verketteten Aufrufen
function mockSupabase(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  const from = vi.fn().mockReturnValue(chain);
  return { from, chain } as unknown as {
    from: ReturnType<typeof vi.fn>;
    chain: typeof chain;
  };
}

const MOCK_EVENT = {
  id: "evt-1",
  resident_id: "user-resident",
  created_by: "user-resident",
  scheduled_at: "2026-04-15T10:00:00Z",
  title: "Arztbesuch",
  who_comes: "Petra",
  description: "Blutdruck messen",
  created_at: "2026-04-12T18:00:00Z",
  deleted_at: null,
};

describe("createCircleEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("erstellt einen Termin und gibt ihn zurueck", async () => {
    const { from, chain } = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: MOCK_EVENT, error: null }),
    });
    const sb = { from } as unknown as SupabaseClient;

    const result = await createCircleEvent(sb, "user-resident", {
      residentId: "user-resident",
      scheduledAt: "2026-04-15T10:00:00Z",
      title: "Arztbesuch",
      whoComes: "Petra",
      description: "Blutdruck messen",
    });

    expect(from).toHaveBeenCalledWith("circle_events");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        resident_id: "user-resident",
        created_by: "user-resident",
        title: "Arztbesuch",
        who_comes: "Petra",
      }),
    );
    expect(result.id).toBe("evt-1");
  });

  it("wirft Fehler bei leerem Titel", async () => {
    const { from } = mockSupabase();
    const sb = { from } as unknown as SupabaseClient;

    await expect(
      createCircleEvent(sb, "user-resident", {
        residentId: "user-resident",
        scheduledAt: "2026-04-15T10:00:00Z",
        title: "",
        whoComes: "",
      }),
    ).rejects.toThrow("Titel darf nicht leer sein");
  });

  it("wirft Fehler bei DB-Fehler", async () => {
    const { from } = mockSupabase({
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "RLS denied" } }),
    });
    const sb = { from } as unknown as SupabaseClient;

    await expect(
      createCircleEvent(sb, "user-resident", {
        residentId: "user-resident",
        scheduledAt: "2026-04-15T10:00:00Z",
        title: "Test",
        whoComes: "",
      }),
    ).rejects.toThrow("Termin konnte nicht erstellt werden");
  });
});

describe("listUpcoming", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gibt Termine ab jetzt zurueck, sortiert nach scheduled_at", async () => {
    const events = [
      MOCK_EVENT,
      { ...MOCK_EVENT, id: "evt-2", title: "Friseur" },
    ];
    const { from, chain } = mockSupabase({
      order: vi.fn().mockResolvedValue({ data: events, error: null }),
    });
    const sb = { from } as unknown as SupabaseClient;

    const result = await listUpcoming(sb, "user-resident");

    expect(from).toHaveBeenCalledWith("circle_events");
    expect(chain.eq).toHaveBeenCalledWith("resident_id", "user-resident");
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Arztbesuch");
  });

  it("gibt leeres Array zurueck wenn keine Termine", async () => {
    const { from } = mockSupabase({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const sb = { from } as unknown as SupabaseClient;

    const result = await listUpcoming(sb, "user-resident");
    expect(result).toEqual([]);
  });
});

describe("markAsDone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("setzt deleted_at auf den Termin", async () => {
    const { from, chain } = mockSupabase({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    const sb = { from } as unknown as SupabaseClient;

    await markAsDone(sb, "evt-1", "user-resident");

    expect(from).toHaveBeenCalledWith("circle_events");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
  });
});
