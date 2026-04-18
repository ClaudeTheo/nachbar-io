import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useLeistungenTeaserState } from "../use-teaser-state";

const createClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

type AnyMock = ReturnType<typeof vi.fn>;

function supabaseStub(options: {
  flagEnabled: boolean;
  plan: string | null;
  status?: string;
  trialEndsAt?: string | null;
  userId?: string | null;
}) {
  const {
    flagEnabled,
    plan,
    status = "active",
    trialEndsAt = null,
    userId = "u1",
  } = options;

  const flagSingle: AnyMock = vi.fn(async () => ({
    data: { enabled: flagEnabled },
    error: null,
  }));
  const subsSingle: AnyMock = vi.fn(async () => ({
    data: plan ? { plan, status, trial_ends_at: trialEndsAt } : null,
    error: null,
  }));

  return {
    from: vi.fn((table: string) => {
      if (table === "feature_flags") {
        return { select: () => ({ eq: () => ({ single: flagSingle }) }) };
      }
      if (table === "care_subscriptions") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: subsSingle }) }),
        };
      }
      throw new Error(`unexpected from(${table})`);
    }),
    auth: {
      getUser: vi.fn(async () => ({
        data: userId ? { user: { id: userId } } : { user: null },
      })),
    },
  };
}

describe("useLeistungenTeaserState", () => {
  afterEach(() => {
    cleanup();
    createClientMock.mockReset();
  });

  it("Flag off → show=false, teaser nicht gerendert", async () => {
    createClientMock.mockReturnValue(
      supabaseStub({ flagEnabled: false, plan: "plus" }),
    );
    const { result } = renderHook(() => useLeistungenTeaserState());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.show).toBe(false);
  });

  it("Flag on + plan=plus → show=true, hasPlus=true", async () => {
    createClientMock.mockReturnValue(
      supabaseStub({ flagEnabled: true, plan: "plus", status: "active" }),
    );
    const { result } = renderHook(() => useLeistungenTeaserState());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.show).toBe(true);
    expect(result.current.hasPlus).toBe(true);
  });

  it("Flag on + plan=free → show=true, hasPlus=false (Paywall)", async () => {
    createClientMock.mockReturnValue(
      supabaseStub({ flagEnabled: true, plan: "free" }),
    );
    const { result } = renderHook(() => useLeistungenTeaserState());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.show).toBe(true);
    expect(result.current.hasPlus).toBe(false);
  });
});
