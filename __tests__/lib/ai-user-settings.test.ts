import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAiHelpState,
  setAiAssistanceLevel,
  setAiHelpEnabled,
} from "@/lib/ai/user-settings";

const mockUpdateConsents = vi.fn();

vi.mock("@/modules/care/services/consent-routes.service", () => ({
  updateConsents: (...args: unknown[]) => mockUpdateConsents(...args),
}));

function createUsersSettingsSupabase(settings: Record<string, unknown> | null) {
  const update = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table !== "users") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { settings }, error: null }),
        }),
      }),
      update: vi.fn((payload: unknown) => {
        update(payload);
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };
  });

  return { supabase: { from }, update };
}

describe("AI user settings", () => {
  beforeEach(() => {
    mockUpdateConsents.mockReset();
  });

  it("defaults KI-Hilfe to off when users.settings has no flag", async () => {
    const { supabase } = createUsersSettingsSupabase({});

    await expect(getAiHelpState(supabase as never, "user-1")).resolves.toEqual({
      enabled: false,
      assistanceLevel: "off",
    });
  });

  it("reads existing assistanceLevel when present", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: true,
      ai_assistance_level: "everyday",
    });

    await expect(getAiHelpState(supabase as never, "user-1")).resolves.toEqual({
      enabled: true,
      assistanceLevel: "everyday",
    });
  });

  it("persists off to basic with audit log and consent grant", async () => {
    const { supabase, update } = createUsersSettingsSupabase({
      theme: "large",
      ai_enabled: false,
      ai_assistance_level: "off",
      ai_audit_log: [
        { reason: "onboarding", from: "later", to: "off", at: "old" },
      ],
    });

    await setAiAssistanceLevel(
      supabase as never,
      "user-1",
      "basic",
      "settings",
    );

    expect(update).toHaveBeenCalledWith({
      settings: expect.objectContaining({
        theme: "large",
        ai_enabled: true,
        ai_assistance_level: "basic",
        ai_audit_log: [
          { reason: "onboarding", from: "later", to: "off", at: "old" },
          expect.objectContaining({
            reason: "settings",
            from: "off",
            to: "basic",
          }),
        ],
      }),
    });
    expect(mockUpdateConsents).toHaveBeenCalledWith(supabase, "user-1", {
      ai_onboarding: true,
    });
  });

  it("persists basic to everyday without consent touch", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: true,
      ai_assistance_level: "basic",
    });

    await setAiAssistanceLevel(
      supabase as never,
      "user-1",
      "everyday",
      "settings",
    );

    expect(mockUpdateConsents).not.toHaveBeenCalled();
  });

  it("persists everyday to off with consent revoke", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: true,
      ai_assistance_level: "everyday",
    });

    await setAiAssistanceLevel(
      supabase as never,
      "user-1",
      "off",
      "settings",
    );

    expect(mockUpdateConsents).toHaveBeenCalledWith(supabase, "user-1", {
      ai_onboarding: false,
    });
  });

  it("treats later to basic as consent threshold crossing", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: false,
      ai_assistance_level: "later",
    });

    await setAiAssistanceLevel(
      supabase as never,
      "user-1",
      "basic",
      "settings",
    );

    expect(mockUpdateConsents).toHaveBeenCalledWith(supabase, "user-1", {
      ai_onboarding: true,
    });
  });

  it("keeps setAiHelpEnabled as wrapper for legacy callers", async () => {
    const { supabase, update } = createUsersSettingsSupabase({});

    await setAiHelpEnabled(supabase as never, "user-1", true, "settings");

    expect(update).toHaveBeenCalledWith({
      settings: expect.objectContaining({
        ai_enabled: true,
        ai_assistance_level: "basic",
      }),
    });
  });
});
