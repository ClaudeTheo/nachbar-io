// lib/__tests__/feature-flags-middleware-cache.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockSupabaseSingle = vi.fn();

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSupabaseSingle,
        }),
      }),
    }),
  })),
}));

describe("getCachedFlagEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_PILOT_MODE;
  });

  it("Cache-Hit 1: liefert true ohne DB-Call", async () => {
    mockRedisGet.mockResolvedValue("1");
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(true);
    expect(mockSupabaseSingle).not.toHaveBeenCalled();
  });

  it("Cache-Hit 0: liefert false ohne DB-Call", async () => {
    mockRedisGet.mockResolvedValue("0");
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(false);
    expect(mockSupabaseSingle).not.toHaveBeenCalled();
  });

  it("Cache-Miss: faellt auf DB zurueck und schreibt Cache", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseSingle.mockResolvedValue({ data: { enabled: true } });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(true);
    expect(mockRedisSet).toHaveBeenCalledWith("ff:MEDICATIONS_ENABLED", "1", {
      ex: 60,
    });
  });

  it("Cache-Miss und Flag disabled: liefert false und cached '0'", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseSingle.mockResolvedValue({ data: { enabled: false } });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(false);
    expect(mockRedisSet).toHaveBeenCalledWith("ff:MEDICATIONS_ENABLED", "0", {
      ex: 60,
    });
  });

  it("ignoriert PILOT_MODE und respektiert deaktivierte Cache-Werte", async () => {
    process.env.NEXT_PUBLIC_PILOT_MODE = "true";
    mockRedisGet.mockResolvedValue("0");
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(false);
    expect(mockRedisGet).toHaveBeenCalledWith("ff:MEDICATIONS_ENABLED");
    expect(mockSupabaseSingle).not.toHaveBeenCalled();
  });

  it("DB-Fehler: fail-closed (false)", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseSingle.mockRejectedValue(new Error("DB down"));
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(false);
  });

  it("Redis-Fehler: faellt auf DB zurueck", async () => {
    mockRedisGet.mockRejectedValue(new Error("Redis down"));
    mockSupabaseSingle.mockResolvedValue({ data: { enabled: true } });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(true);
  });
});
