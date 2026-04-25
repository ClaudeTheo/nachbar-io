import { describe, expect, it, vi } from "vitest";
import {
  getAiHelpState,
  setAiHelpEnabled,
} from "@/lib/ai/user-settings";

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
  it("defaults KI-Hilfe to off when users.settings has no flag", async () => {
    const { supabase } = createUsersSettingsSupabase({});

    await expect(getAiHelpState(supabase as never, "user-1")).resolves.toEqual({
      enabled: false,
    });
  });

  it("persists the switch and appends an audit log entry", async () => {
    const { supabase, update } = createUsersSettingsSupabase({
      theme: "large",
      ai_audit_log: [{ enabled: false, source: "onboarding", at: "old" }],
    });

    await setAiHelpEnabled(supabase as never, "user-1", true, "settings");

    expect(update).toHaveBeenCalledWith({
      settings: expect.objectContaining({
        theme: "large",
        ai_enabled: true,
        ai_audit_log: [
          { enabled: false, source: "onboarding", at: "old" },
          expect.objectContaining({ enabled: true, source: "settings" }),
        ],
      }),
    });
  });
});
