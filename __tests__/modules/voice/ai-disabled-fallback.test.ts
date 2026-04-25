import { describe, expect, it, vi } from "vitest";

const { anthropicConstructor } = vi.hoisted(() => ({
  anthropicConstructor: vi.fn(function MockAnthropic(this: {
    messages: { create: ReturnType<typeof vi.fn>; stream: ReturnType<typeof vi.fn> };
  }) {
    this.messages = {
      create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "provider used" }] }),
      stream: vi.fn(),
    };
  }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: anthropicConstructor,
}));

import { handleJsonResponse } from "@/modules/voice/services/companion-chat.service";

function createSupabaseWithSettings(settings: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "users") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { settings }, error: null }),
          }),
        }),
      };
    }),
  };
}

describe("companion chat AI settings gate", () => {
  it("returns a friendly fallback without constructing Anthropic when KI-Hilfe is off", async () => {
    const supabase = createSupabaseWithSettings({ ai_enabled: false });

    const result = await handleJsonResponse(
      "system",
      [{ role: "user", content: "Lies mir das vor" }],
      "user-1",
      [],
      supabase as never,
    );

    expect(result).toEqual({
      message: expect.stringMatching(/KI-Hilfe.*ausgeschaltet/i),
      aiDisabled: true,
    });
    expect(anthropicConstructor).not.toHaveBeenCalled();
  });
});
