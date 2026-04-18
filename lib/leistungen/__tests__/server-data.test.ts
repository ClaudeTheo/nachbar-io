import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadLeistungenContext } from "../server-data";

type AnyMock = ReturnType<typeof vi.fn>;

function buildSupabaseMock(options: {
  quarter?: { country: string | null; state: string | null } | null;
  subscription?: {
    plan: string;
    status: string;
    trial_ends_at: string | null;
  } | null;
  flag?: boolean;
  quarterError?: boolean;
}) {
  const { quarter, subscription, flag = true, quarterError } = options;

  const membershipSingle: AnyMock = vi.fn(async () => {
    if (quarterError) return { data: null, error: new Error("no quarter") };
    if (!quarter) return { data: null, error: null };
    return {
      data: { household: { quarter_id: "q1" } },
      error: null,
    };
  });

  const quarterSingle: AnyMock = vi.fn(async () => {
    if (!quarter) return { data: null, error: null };
    return { data: quarter, error: null };
  });

  const subsSingle: AnyMock = vi.fn(async () => {
    if (!subscription) return { data: null, error: null };
    return { data: subscription, error: null };
  });

  const flagSingle: AnyMock = vi.fn(async () => ({
    data: { enabled: flag },
    error: null,
  }));

  const from = vi.fn((table: string) => {
    if (table === "household_members") {
      return {
        select: () => ({
          eq: () => ({ limit: () => ({ maybeSingle: membershipSingle }) }),
        }),
      };
    }
    if (table === "quarters") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: quarterSingle }) }),
      };
    }
    if (table === "care_subscriptions") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: subsSingle }) }),
      };
    }
    if (table === "feature_flags") {
      return {
        select: () => ({ eq: () => ({ single: flagSingle }) }),
      };
    }
    throw new Error(`unexpected from(${table})`);
  });

  return { from } as never;
}

describe("loadLeistungenContext", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PILOT_MODE = "false";
  });

  it("DE-Quartier → country=DE, cantonHint=null, subscription geladen, flag aktiv", async () => {
    const supabase = buildSupabaseMock({
      quarter: { country: "DE", state: "BW" },
      subscription: { plan: "plus", status: "active", trial_ends_at: null },
      flag: true,
    });
    const ctx = await loadLeistungenContext(supabase, "u1");
    expect(ctx.country).toBe("DE");
    expect(ctx.cantonHint).toBeNull();
    expect(ctx.subscription?.plan).toBe("plus");
    expect(ctx.flagEnabled).toBe(true);
  });

  it("CH-AG-Quartier → country=CH, cantonHint=AG", async () => {
    const supabase = buildSupabaseMock({
      quarter: { country: "CH", state: "AG" },
      subscription: { plan: "plus", status: "active", trial_ends_at: null },
      flag: true,
    });
    const ctx = await loadLeistungenContext(supabase, "u1");
    expect(ctx.country).toBe("CH");
    expect(ctx.cantonHint).toBe("AG");
  });

  it("Flag off → flagEnabled=false, Rest wird trotzdem geladen", async () => {
    const supabase = buildSupabaseMock({
      quarter: { country: "DE", state: null },
      subscription: { plan: "free", status: "active", trial_ends_at: null },
      flag: false,
    });
    const ctx = await loadLeistungenContext(supabase, "u1");
    expect(ctx.flagEnabled).toBe(false);
    expect(ctx.country).toBe("DE");
    expect(ctx.subscription?.plan).toBe("free");
  });

  it("Kein Quartier → Fallback country=DE, cantonHint=null", async () => {
    const supabase = buildSupabaseMock({
      quarter: null,
      subscription: null,
      flag: true,
    });
    const ctx = await loadLeistungenContext(supabase, "u1");
    expect(ctx.country).toBe("DE");
    expect(ctx.cantonHint).toBeNull();
    expect(ctx.subscription).toBeNull();
  });
});
