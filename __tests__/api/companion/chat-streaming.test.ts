import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Anthropic SDK mit Stream-Support
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      stream: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hallo " },
          };
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Welt" },
          };
          yield { type: "message_stop" };
        },
      }),
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Hallo Welt" }],
        stop_reason: "end_turn",
      }),
    };
  }
  return { default: MockAnthropic };
});

vi.mock("@/modules/voice/services/context-loader", () => ({
  loadQuarterContext: vi.fn().mockResolvedValue({
    quarterName: "Testquartier",
    wasteDate: [],
    events: [],
    bulletinPosts: [],
    meals: [],
  }),
}));

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "test-user" },
    supabase: {
      from: vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { granted: true }, error: null }),
          ),
          single: vi.fn(() => {
            if (table === "users") {
              return Promise.resolve({
                data: {
                  settings: { ai_enabled: true },
                  subscription_plan: "free",
                  raw_user_meta_data: {},
                },
                error: null,
              });
            }
            if (table === "feature_flags") {
              return Promise.resolve({ data: { enabled: false }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        return chain;
      }),
    },
  }),
  unauthorizedResponse: vi
    .fn()
    .mockReturnValue(new Response("Unauthorized", { status: 401 })),
  errorResponse: vi.fn().mockImplementation(
    (msg: string, status: number) =>
      new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ),
}));

vi.mock("@/lib/ai/user-settings", () => ({
  canUsePersonalAi: vi.fn().mockResolvedValue(true),
  buildAiDisabledResponse: vi.fn().mockResolvedValue(null),
  AI_HELP_DISABLED_MESSAGE: "KI-Hilfe ist ausgeschaltet.",
}));

vi.mock("@/modules/voice/services/system-prompt", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("Du bist der Quartier-Lotse."),
}));

vi.mock("@/modules/voice/services/tools", () => ({
  companionTools: [],
}));

vi.mock("@/modules/voice/services/tool-executor", () => ({
  isWriteTool: vi.fn().mockReturnValue(false),
  executeCompanionTool: vi
    .fn()
    .mockResolvedValue({ success: true, summary: "OK" }),
}));

describe("POST /api/companion/chat (streaming)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SSE stream with text/event-stream content type", async () => {
    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hallo" }],
        stream: true,
      }),
    });
    const res = await POST(req);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.status).toBe(200);
  });

  it("still supports non-streaming mode (backwards compatible)", async () => {
    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hallo" }],
      }),
    });
    const res = await POST(req);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json.message).toBe("Hallo Welt");
  });

  it("SSE stream contains text and done events", async () => {
    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hallo" }],
        stream: true,
      }),
    });
    const res = await POST(req);
    const text = await res.text();
    expect(text).toContain("event: text");
    expect(text).toContain("event: done");
    expect(text).toContain('"delta":"Hallo "');
  });
});
