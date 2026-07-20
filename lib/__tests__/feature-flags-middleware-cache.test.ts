import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockFeatureSingle = vi.fn();
const mockMembershipMaybeSingle = vi.fn();
const mockAdminMaybeSingle = vi.fn();
const mockAuthGetUser = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === "feature_flags") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockFeatureSingle })),
      })),
    };
  }

  if (table === "users") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockAdminMaybeSingle })),
      })),
    };
  }

  if (table === "household_members") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            limit: vi.fn(() => ({ maybeSingle: mockMembershipMaybeSingle })),
          })),
        })),
      })),
    };
  }

  throw new Error(`Unerwartete Tabelle: ${table}`);
});

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockAuthGetUser },
    from: mockFrom,
  })),
}));

const globalEnabled = {
  enabled: true,
  enabled_quarters: [],
  admin_override: false,
};

const quarterEnabled = {
  enabled: true,
  enabled_quarters: ["quarter-a"],
  admin_override: false,
};

describe("getCachedFlagEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_PILOT_MODE;
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockAdminMaybeSingle.mockResolvedValue({
      data: { is_admin: false },
      error: null,
    });
    mockMembershipMaybeSingle.mockResolvedValue({
      data: { households: { quarter_id: "quarter-a" } },
      error: null,
    });
  });

  it("Cache-Hit: gibt ein global aktiviertes Flag ohne DB-Call frei", async () => {
    mockRedisGet.mockResolvedValue(globalEnabled);
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      true,
    );
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockAuthGetUser).not.toHaveBeenCalled();
  });

  it("Cache-Hit: sperrt ein deaktiviertes Flag", async () => {
    mockRedisGet.mockResolvedValue({ ...globalEnabled, enabled: false });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      false,
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("Cache-Hit: wertet das authentifizierte Quartier pro Request aus", async () => {
    mockRedisGet.mockResolvedValue(quarterEnabled);
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      true,
    );
    expect(mockFrom).not.toHaveBeenCalledWith("feature_flags");
    expect(mockFrom).toHaveBeenCalledWith("household_members");
  });

  it("Cache-Hit: sperrt ein anderes Quartier", async () => {
    mockRedisGet.mockResolvedValue(quarterEnabled);
    mockMembershipMaybeSingle.mockResolvedValue({
      data: { households: { quarter_id: "quarter-b" } },
      error: null,
    });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      false,
    );
  });

  it("Cache-Hit: sperrt ohne Mitgliedschaft fail-closed", async () => {
    mockRedisGet.mockResolvedValue(quarterEnabled);
    mockMembershipMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      false,
    );
  });

  it("behandelt eine ungueltige Quartier-Konfiguration nicht als global", async () => {
    mockRedisGet.mockResolvedValue({
      enabled: true,
      enabled_quarters: "quarter-a",
      admin_override: false,
    });
    mockFeatureSingle.mockResolvedValue({ data: quarterEnabled, error: null });
    mockMembershipMaybeSingle.mockResolvedValue({
      data: { households: { quarter_id: "quarter-b" } },
      error: null,
    });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      false,
    );
    expect(mockFrom).toHaveBeenCalledWith("feature_flags");
  });

  it("Cache-Hit: admin_override nutzt nur den serverseitigen Admin-Status", async () => {
    mockRedisGet.mockResolvedValue({
      ...quarterEnabled,
      admin_override: true,
    });
    mockAdminMaybeSingle.mockResolvedValue({
      data: { is_admin: true },
      error: null,
    });
    mockMembershipMaybeSingle.mockResolvedValue({
      data: { households: { quarter_id: "quarter-b" } },
      error: null,
    });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      true,
    );
    expect(mockFrom).toHaveBeenCalledWith("users");
  });

  it("Cache-Miss: cached die Flag-Konfiguration statt einer Nutzerentscheidung", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFeatureSingle.mockResolvedValue({ data: quarterEnabled, error: null });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      true,
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "ff:v2:MEDICATIONS_ENABLED",
      quarterEnabled,
      { ex: 60 },
    );
  });

  it("ignoriert PILOT_MODE und respektiert die Quartier-Sperre", async () => {
    process.env.NEXT_PUBLIC_PILOT_MODE = "true";
    mockRedisGet.mockResolvedValue(quarterEnabled);
    mockMembershipMaybeSingle.mockResolvedValue({
      data: { households: { quarter_id: "quarter-b" } },
      error: null,
    });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      false,
    );
  });

  it("DB-Fehler: fail-closed", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFeatureSingle.mockRejectedValue(new Error("DB down"));
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      false,
    );
  });

  it("Redis-Fehler: faellt auf die DB zurueck", async () => {
    mockRedisGet.mockRejectedValue(new Error("Redis down"));
    mockFeatureSingle.mockResolvedValue({ data: globalEnabled, error: null });
    const { getCachedFlagEnabled } =
      await import("@/lib/feature-flags-middleware-cache");

    await expect(getCachedFlagEnabled("MEDICATIONS_ENABLED")).resolves.toBe(
      true,
    );
  });
});
