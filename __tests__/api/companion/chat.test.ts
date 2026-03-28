// __tests__/api/companion/chat.test.ts
// Tests fuer den Companion Chat API-Endpunkt
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mocks
const mockRequireAuth = vi.fn();
const mockLoadQuarterContext = vi.fn();
const mockBuildSystemPrompt = vi.fn();
const mockExecuteCompanionTool = vi.fn();
const mockAnthropicCreate = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  unauthorizedResponse: () =>
    NextResponse.json(
      { error: "Nicht authentifiziert", code: "UNAUTHORIZED" },
      { status: 401 },
    ),
  errorResponse: (message: string, status: number) => {
    console.error(`[care/api] ${status}: ${message}`);
    return NextResponse.json({ error: message }, { status });
  },
}));

vi.mock("@/modules/voice/services/context-loader", () => ({
  loadQuarterContext: (...args: unknown[]) => mockLoadQuarterContext(...args),
}));

vi.mock("@/modules/voice/services/system-prompt", () => ({
  buildSystemPrompt: (...args: unknown[]) => mockBuildSystemPrompt(...args),
}));

vi.mock("@/modules/voice/services/tools", () => ({
  companionTools: [
    {
      name: "get_waste_dates",
      description: "Muelltermine",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "create_bulletin_post",
      description: "Beitrag erstellen",
      input_schema: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    },
  ],
}));

vi.mock("@/modules/voice/services/tool-executor", () => ({
  isWriteTool: (name: string) =>
    [
      "create_bulletin_post",
      "create_help_request",
      "create_event",
      "report_issue",
      "create_marketplace_listing",
      "update_help_offers",
      "send_message",
      "update_profile",
    ].includes(name),
  executeCompanionTool: (...args: unknown[]) =>
    mockExecuteCompanionTool(...args),
}));

vi.mock("@anthropic-ai/sdk", () => {
  // Echte Klasse statt Arrow-Function, damit 'new Anthropic()' funktioniert
  class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => mockAnthropicCreate(...args),
    };
  }
  return { default: MockAnthropic };
});

// Standard-Context fuer Tests
const defaultContext = {
  quarterName: "Oberer Rebberg",
  wasteDate: [],
  events: [],
  bulletinPosts: [],
};

describe("POST /api/companion/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Standard-Mocks
    mockLoadQuarterContext.mockResolvedValue(defaultContext);
    mockBuildSystemPrompt.mockReturnValue("Du bist der Quartier-Lotse...");
  });

  it("gibt 401 zurueck wenn nicht authentifiziert", async () => {
    mockRequireAuth.mockResolvedValue(null);

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hallo" }] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("gibt 400 zurueck bei leeren Nachrichten", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck bei fehlendem messages-Feld", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck bei ungueltigem JSON", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: "kein-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("gibt Chat-Antwort mit Text zurueck", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockAnthropicCreate.mockResolvedValue({
      content: [
        { type: "text", text: "Guten Tag! Wie kann ich Ihnen helfen?" },
      ],
    });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hallo" }] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Guten Tag! Wie kann ich Ihnen helfen?");
    expect(data.toolResults).toBeUndefined();
    expect(data.confirmations).toBeUndefined();
  });

  it("begrenzt Nachrichten auf 20 (Session-Gedaechtnis)", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
    });

    // 25 Nachrichten senden
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Nachricht ${i}`,
    }));

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    // Anthropic sollte nur die letzten 20 Nachrichten erhalten
    const callArgs = mockAnthropicCreate.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(20);
    // Letzte Nachricht sollte "Nachricht 24" sein
    expect(callArgs.messages[19].content).toBe("Nachricht 24");
  });

  it("fuehrt Read-Tools sofort aus und gibt Ergebnis zurueck", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockAnthropicCreate.mockResolvedValue({
      content: [
        { type: "text", text: "Hier sind Ihre Muelltermine:" },
        { type: "tool_use", id: "tu1", name: "get_waste_dates", input: {} },
      ],
    });
    mockExecuteCompanionTool.mockResolvedValue({
      success: true,
      summary: "Mo, 24.03.2026: Restmuell",
      data: [{ date: "Mo, 24.03.2026", type: "Restmuell" }],
    });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Wann ist Muellabfuhr?" }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Hier sind Ihre Muelltermine:");
    expect(data.toolResults).toHaveLength(1);
    expect(data.toolResults[0].success).toBe(true);
    expect(mockExecuteCompanionTool).toHaveBeenCalledWith(
      "get_waste_dates",
      {},
      "u1",
    );
  });

  it("fordert Bestaetigung fuer Write-Tools an (ohne Ausfuehrung)", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockAnthropicCreate.mockResolvedValue({
      content: [
        { type: "text", text: "Soll ich den Beitrag veroeffentlichen?" },
        {
          type: "tool_use",
          id: "tu2",
          name: "create_bulletin_post",
          input: {
            title: "Strassenfest",
            text: "Am Samstag findet ein Fest statt.",
            category: "event",
          },
        },
      ],
    });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Erstelle einen Beitrag fuer das Strassenfest",
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Soll ich den Beitrag veroeffentlichen?");
    expect(data.confirmations).toHaveLength(1);
    expect(data.confirmations[0].tool).toBe("create_bulletin_post");
    expect(data.confirmations[0].params.title).toBe("Strassenfest");
    expect(data.confirmations[0].description).toContain("Strassenfest");

    // Write-Tool darf NICHT ausgefuehrt worden sein
    expect(mockExecuteCompanionTool).not.toHaveBeenCalled();
  });

  it("fuehrt bestaetigtes Write-Tool aus (confirmTool)", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockExecuteCompanionTool.mockResolvedValue({
      success: true,
      summary:
        'Beitrag "Strassenfest" wurde auf dem Schwarzen Brett veroeffentlicht.',
    });
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Der Beitrag wurde erfolgreich veroeffentlicht!",
        },
      ],
    });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Erstelle einen Beitrag fuer das Strassenfest",
          },
          {
            role: "assistant",
            content: "Soll ich den Beitrag veroeffentlichen?",
          },
          { role: "user", content: "Ja, bitte" },
        ],
        confirmTool: {
          tool: "create_bulletin_post",
          params: {
            title: "Strassenfest",
            text: "Am Samstag findet ein Fest statt.",
          },
        },
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    // Nach Fix: Bestaetigung gibt direkt das Tool-Ergebnis zurueck (kein erneuter Claude-Call)
    expect(data.message).toContain("Strassenfest");
    expect(data.toolResults).toHaveLength(1);
    expect(data.toolResults[0].success).toBe(true);

    // Tool muss mit den richtigen Parametern ausgefuehrt worden sein
    expect(mockExecuteCompanionTool).toHaveBeenCalledWith(
      "create_bulletin_post",
      { title: "Strassenfest", text: "Am Samstag findet ein Fest statt." },
      "u1",
    );

    // Kein erneuter Claude-Call nach Bestaetigung (Performance-Fix)
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it("gibt 500 mit KI-Fehler bei Anthropic-Fehlern zurueck", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockAnthropicCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hallo" }] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("KI-Fehler");
  });

  it("uebergibt korrektes Modell und System-Prompt an Claude", async () => {
    mockRequireAuth.mockResolvedValue({ supabase: {}, user: { id: "u1" } });
    mockBuildSystemPrompt.mockReturnValue("Test-System-Prompt");
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
    });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    const callArgs = mockAnthropicCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
    expect(callArgs.max_tokens).toBe(768);
    expect(callArgs.system).toBe("Test-System-Prompt");
    expect(callArgs.tools).toBeDefined();
    expect(callArgs.messages).toHaveLength(1);
  });

  it("laedt Quartier-Kontext fuer den authentifizierten Nutzer", async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: {},
      user: { id: "user-42" },
    });
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
    });

    const { POST } = await import("@/app/api/companion/chat/route");
    const req = new NextRequest("http://localhost/api/companion/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    expect(mockLoadQuarterContext).toHaveBeenCalledWith("user-42");
    expect(mockBuildSystemPrompt).toHaveBeenCalledWith(defaultContext);
  });
});
