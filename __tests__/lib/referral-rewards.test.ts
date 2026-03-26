import { describe, it, expect, vi } from "vitest";
import {
  REWARD_TIERS,
  hasReward,
  getMarketplaceLimit,
} from "@/lib/referral-rewards";

// ============================================================
// REWARD_TIERS Konfiguration
// ============================================================
describe("REWARD_TIERS", () => {
  it("hat 2 Belohnungsstufen", () => {
    expect(REWARD_TIERS).toHaveLength(2);
  });

  it("Stufe 1: 3 Einladungen -> marketplace_extended", () => {
    expect(REWARD_TIERS[0].threshold).toBe(3);
    expect(REWARD_TIERS[0].key).toBe("marketplace_extended");
  });

  it("Stufe 2: 5 Einladungen -> referral_premium", () => {
    expect(REWARD_TIERS[1].threshold).toBe(5);
    expect(REWARD_TIERS[1].key).toBe("referral_premium");
  });

  it("Schwellen sind aufsteigend sortiert", () => {
    for (let i = 1; i < REWARD_TIERS.length; i++) {
      expect(REWARD_TIERS[i].threshold).toBeGreaterThan(
        REWARD_TIERS[i - 1].threshold,
      );
    }
  });
});

// ============================================================
// hasReward
// ============================================================
describe("hasReward", () => {
  it("gibt true zurueck wenn Belohnung existiert", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Letzter eq-Aufruf resolved mit count
    mockChain.eq.mockResolvedValueOnce({ count: 1 });
    // Vorheriger eq-Aufruf gibt mockChain zurueck
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.eq.mockResolvedValueOnce({ count: 1 });

    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1 }),
          }),
        }),
      }),
    };

    const result = await hasReward(
      mock as never,
      "user-1",
      "marketplace_extended",
    );
    expect(result).toBe(true);
  });

  it("gibt false zurueck wenn Belohnung nicht existiert", async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        }),
      }),
    };

    const result = await hasReward(
      mock as never,
      "user-1",
      "marketplace_extended",
    );
    expect(result).toBe(false);
  });
});

// ============================================================
// getMarketplaceLimit
// ============================================================
describe("getMarketplaceLimit", () => {
  it("gibt 3 zurueck ohne Belohnung", async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        }),
      }),
    };

    const limit = await getMarketplaceLimit(mock as never, "user-1");
    expect(limit).toBe(3);
  });

  it("gibt 10 zurueck mit marketplace_extended Belohnung", async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1 }),
          }),
        }),
      }),
    };

    const limit = await getMarketplaceLimit(mock as never, "user-1");
    expect(limit).toBe(10);
  });
});
