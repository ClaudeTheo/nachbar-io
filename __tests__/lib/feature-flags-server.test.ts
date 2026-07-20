import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

type FlagRow = {
  enabled: boolean;
  enabled_quarters: string[];
  admin_override: boolean;
};

function createSupabaseMock(options: {
  flag?: FlagRow | null;
  userId?: string | null;
  quarterId?: string | null;
  isAdmin?: boolean;
}) {
  const flag = options.flag ?? {
    enabled: true,
    enabled_quarters: [],
    admin_override: false,
  };
  const featureSingle = vi.fn().mockResolvedValue({ data: flag, error: null });
  const membershipMaybeSingle = vi.fn().mockResolvedValue({
    data: options.quarterId
      ? { households: { quarter_id: options.quarterId } }
      : null,
    error: null,
  });
  const adminMaybeSingle = vi.fn().mockResolvedValue({
    data: { is_admin: options.isAdmin === true },
    error: null,
  });
  const authGetUser = vi.fn().mockResolvedValue({
    data: {
      user:
        options.userId === null
          ? null
          : { id: options.userId ?? "user-1" },
    },
    error: null,
  });

  const from = vi.fn((table: string) => {
    if (table === "feature_flags") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: featureSingle })),
        })),
      };
    }

    if (table === "users") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: adminMaybeSingle })),
        })),
      };
    }

    if (table === "household_members") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({
              limit: vi.fn(() => ({ maybeSingle: membershipMaybeSingle })),
            })),
          })),
        })),
      };
    }

    throw new Error(`Unerwartete Tabelle: ${table}`);
  });

  return {
    supabase: {
      auth: { getUser: authGetUser },
      from,
    } as unknown as SupabaseClient,
    authGetUser,
    from,
  };
}

describe("isFeatureEnabledServer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("gibt ein global aktiviertes Flag ohne Mitgliedschaft frei", async () => {
    const mock = createSupabaseMock({ userId: null });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(true);
    expect(mock.authGetUser).not.toHaveBeenCalled();
  });

  it("sperrt ein deaktiviertes Flag immer", async () => {
    const mock = createSupabaseMock({
      flag: {
        enabled: false,
        enabled_quarters: ["quarter-a"],
        admin_override: true,
      },
      isAdmin: true,
      quarterId: "quarter-a",
    });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(false);
    expect(mock.authGetUser).not.toHaveBeenCalled();
  });

  it("gibt ein quartiersbeschraenktes Flag im eigenen Quartier frei", async () => {
    const mock = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: false,
      },
      quarterId: "quarter-a",
    });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(true);
  });

  it("sperrt ein quartiersbeschraenktes Flag in einem anderen Quartier", async () => {
    const mock = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: false,
      },
      quarterId: "quarter-b",
    });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(false);
  });

  it("ignoriert eine zusaetzlich eingeschleuste Client-Quartier-ID", async () => {
    const mock = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: false,
      },
      quarterId: "quarter-b",
    });
    const manipulatedCall = isFeatureEnabledServer as unknown as (
      supabase: SupabaseClient,
      flagKey: string,
      clientQuarterId: string,
    ) => Promise<boolean>;

    await expect(
      manipulatedCall(mock.supabase, "BOARD_ENABLED", "quarter-a"),
    ).resolves.toBe(false);
  });

  it("sperrt quartiersbeschraenkte Flags ohne Mitgliedschaft", async () => {
    const mock = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: false,
      },
      quarterId: null,
    });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(false);
  });

  it("behandelt eine ungueltige Quartier-Konfiguration fail-closed", async () => {
    const mock = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: "quarter-a",
        admin_override: false,
      } as unknown as FlagRow,
      quarterId: "quarter-b",
    });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(false);
    expect(mock.authGetUser).not.toHaveBeenCalled();
  });

  it("wendet admin_override nur fuer serverseitig verifizierte Admins an", async () => {
    const admin = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: true,
      },
      quarterId: "quarter-b",
      isAdmin: true,
    });
    const resident = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: true,
      },
      quarterId: "quarter-b",
      isAdmin: false,
    });

    await expect(
      isFeatureEnabledServer(admin.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(true);
    await expect(
      isFeatureEnabledServer(resident.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(false);
  });

  it("behandelt PILOT_MODE weiterhin nicht als Berechtigungs-Bypass", async () => {
    vi.stubEnv("NEXT_PUBLIC_PILOT_MODE", "true");
    const mock = createSupabaseMock({
      flag: {
        enabled: true,
        enabled_quarters: ["quarter-a"],
        admin_override: false,
      },
      quarterId: "quarter-b",
    });

    await expect(
      isFeatureEnabledServer(mock.supabase, "BOARD_ENABLED"),
    ).resolves.toBe(false);
  });
});
