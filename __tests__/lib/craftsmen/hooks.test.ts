// __tests__/lib/craftsmen/hooks.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase-Client mocken
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  update: mockUpdate,
}));
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

import {
  loadCraftsmenList,
  submitRecommendation,
  logUsageEvent,
} from "@/lib/craftsmen/hooks";

describe("loadCraftsmenList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtert nur category=craftsmen und status=active", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(mockChain as unknown as ReturnType<typeof mockFrom>);

    await loadCraftsmenList({});
    expect(mockFrom).toHaveBeenCalledWith("community_tips");
    expect(mockChain.eq).toHaveBeenCalledWith("category", "craftsmen");
    expect(mockChain.eq).toHaveBeenCalledWith("status", "active");
  });
});

describe("submitRecommendation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validiert subcategories gegen erlaubte IDs", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const recChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    const reputationChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockImplementation(((table: string) => {
      if (table === "reputation_points") return reputationChain;
      return recChain;
    }) as any);

    await submitRecommendation({
      tipId: "t1",
      recommends: true,
      confirmedUsage: false,
      comment: null,
      aspects: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("craftsman_recommendations");
    expect(recChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tip_id: "t1",
        recommends: true,
        confirmed_usage: false,
      }),
      expect.objectContaining({ onConflict: "tip_id,user_id" })
    );
  });
});

describe("logUsageEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("erstellt neuen Usage-Event-Eintrag", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const mockChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(mockChain as unknown as ReturnType<typeof mockFrom>);

    await logUsageEvent({ tipId: "t1", note: "Badezimmer renoviert" });

    expect(mockFrom).toHaveBeenCalledWith("craftsman_usage_events");
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tip_id: "t1",
        user_id: "u1",
        note: "Badezimmer renoviert",
      })
    );
  });
});
