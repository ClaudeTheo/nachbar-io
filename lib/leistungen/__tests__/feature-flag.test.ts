import { describe, it, expect, vi } from "vitest";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

describe("leistungen_info feature flag", () => {
  it("liest den Flag ueber isFeatureEnabledServer", async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: { enabled: true }, error: null });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const supabase = { from: mockFrom } as never;

    const old = process.env.NEXT_PUBLIC_PILOT_MODE;
    process.env.NEXT_PUBLIC_PILOT_MODE = "false";
    const enabled = await isFeatureEnabledServer(supabase, "leistungen_info");
    process.env.NEXT_PUBLIC_PILOT_MODE = old;

    expect(enabled).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("feature_flags");
    expect(mockEq).toHaveBeenCalledWith("key", "leistungen_info");
  });

  it("fail-open: false wenn DB-Fehler", async () => {
    const mockSingle = vi.fn().mockRejectedValue(new Error("db down"));
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const supabase = { from: mockFrom } as never;

    const old = process.env.NEXT_PUBLIC_PILOT_MODE;
    process.env.NEXT_PUBLIC_PILOT_MODE = "false";
    const enabled = await isFeatureEnabledServer(supabase, "leistungen_info");
    process.env.NEXT_PUBLIC_PILOT_MODE = old;

    expect(enabled).toBe(false);
  });
});
