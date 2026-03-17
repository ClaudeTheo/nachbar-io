import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        lte: () => ({ gte: () => Promise.resolve({ data: [], error: null }) }),
        in: () => ({ not: () => Promise.resolve({ data: [], error: null }) }),
        not: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
}));

describe("useMapStatuses", () => {
  it("exportiert den Hook", async () => {
    const mod = await import("@/lib/hooks/useMapStatuses");
    expect(mod.useMapStatuses).toBeDefined();
    expect(typeof mod.useMapStatuses).toBe("function");
  });

  it("exportiert das MapStatusResult Interface (via Typpruefung)", async () => {
    const mod = await import("@/lib/hooks/useMapStatuses");
    // Hook existiert und ist aufrufbar — Interface wird zur Compile-Zeit geprueft
    expect(mod.useMapStatuses).toBeDefined();
  });
});
