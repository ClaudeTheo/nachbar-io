import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCachedUser = vi.fn();
const mockSingle = vi.fn();
const mockEqAfterUpdate = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEqAfterUpdate }));
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: mockSingle,
    })),
  })),
  update: mockUpdate,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
}));

import { completeOnboarding } from "@/modules/onboarding/services/onboarding";

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedUser.mockResolvedValue({ user: { id: "user-1" } });
    mockSingle.mockResolvedValue({
      data: { settings: { existing: true } },
      error: null,
    });
    mockEqAfterUpdate.mockResolvedValue({ error: null });
  });

  it("speichert den gewaehlten Generationen-Modus zusammen mit dem Onboarding-Status", async () => {
    await completeOnboarding({ uiMode: "comfort" });

    expect(mockUpdate).toHaveBeenCalledWith({
      settings: { existing: true, onboarding_completed: true },
      ui_mode: "comfort",
    });
    expect(mockEqAfterUpdate).toHaveBeenCalledWith("id", "user-1");
  });
});
