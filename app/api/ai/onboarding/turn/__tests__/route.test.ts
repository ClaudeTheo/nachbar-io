// app/api/ai/onboarding/turn/__tests__/route.test.ts
// Tests fuer den Onboarding-Turn-Handler (C5b).
//
// Abgedeckte Faelle (siehe docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md):
//   - 401 ohne Auth
//   - 400 bei kaputtem Body
//   - 503 bei AI_PROVIDER=off
//   - Happy-Path: Text-Response
//   - Tool-Call-Flow: save_memory wird aufgerufen, Ergebnis in Response
//   - Tool-Limit: zu viele Tool-Calls pro Turn -> 500
//   - System-Prompt enthaelt Wissensdokument + Memory-Block
//   - Provider-Call nutzt cache_control.system=true

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, AuthUser } from "@supabase/supabase-js";
import type { AIResponse, AIProvider } from "@/lib/ai/provider";
import { AIProviderError } from "@/lib/ai/provider";

// Hoisted mocks, damit Route-Modul beim ersten Import die Mocks zieht
const {
  mockRequireAuth,
  mockGetProvider,
  mockLoadMemoryContext,
  mockBuildMemoryTool,
  mockSaveMemoryToolHandler,
  mockLoadSeniorAppKnowledge,
  mockCheckCareConsent,
  mockGetAiHelpState,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetProvider: vi.fn(),
  mockLoadMemoryContext: vi.fn(),
  mockBuildMemoryTool: vi.fn(),
  mockSaveMemoryToolHandler: vi.fn(),
  mockLoadSeniorAppKnowledge: vi.fn(),
  mockCheckCareConsent: vi.fn(),
  mockGetAiHelpState: vi.fn(),
}));

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: mockRequireAuth,
  unauthorizedResponse: () =>
    NextResponse.json(
      { error: "Nicht authentifiziert", code: "UNAUTHORIZED" },
      { status: 401 },
    ),
  errorResponse: (msg: string, status: number) =>
    NextResponse.json({ error: msg }, { status }),
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/provider")>();
  return {
    ...actual,
    getProvider: mockGetProvider,
  };
});

vi.mock("@/modules/memory/services/memory-loader", () => ({
  loadMemoryContext: mockLoadMemoryContext,
}));

vi.mock("@/modules/memory/services/chat-integration", () => ({
  buildMemoryTool: mockBuildMemoryTool,
}));

vi.mock("@/lib/ai/tools/save-memory", () => ({
  saveMemoryToolHandler: mockSaveMemoryToolHandler,
}));

vi.mock("@/lib/ai/system-prompts/loader", () => ({
  loadSeniorAppKnowledge: mockLoadSeniorAppKnowledge,
}));

vi.mock("@/modules/care/services/consent", () => ({
  checkCareConsent: mockCheckCareConsent,
}));

vi.mock("@/lib/ai/user-settings", () => ({
  AI_HELP_DISABLED_MESSAGE: "KI-Hilfe ist ausgeschaltet.",
  getAiHelpState: mockGetAiHelpState,
}));

function makeProvider(response: AIResponse | AIResponse[]): AIProvider {
  const chat = Array.isArray(response)
    ? vi.fn().mockImplementation(() => Promise.resolve(response.shift()))
    : vi.fn().mockResolvedValue(response);
  return { name: "mock", chat } as unknown as AIProvider;
}

function textResponse(text: string): AIResponse {
  return {
    text,
    tool_calls: [],
    stop_reason: "end_turn",
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

function toolResponse(
  calls: Array<{ name: string; input: Record<string, unknown> }>,
  text = "",
): AIResponse {
  return {
    text,
    tool_calls: calls,
    stop_reason: "tool_use",
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

const mockSupabase = {} as unknown as SupabaseClient;
const mockUser = { id: "user-senior-001" } as unknown as AuthUser;
const authed = { supabase: mockSupabase, user: mockUser };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/onboarding/turn", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockGetProvider.mockReset();
  mockLoadMemoryContext.mockReset();
  mockBuildMemoryTool.mockReset();
  mockSaveMemoryToolHandler.mockReset();
  mockLoadSeniorAppKnowledge.mockReset();
  mockCheckCareConsent.mockReset();
  mockGetAiHelpState.mockReset();

  // Defaults, die die meisten Tests brauchen
  mockRequireAuth.mockResolvedValue(authed);
  mockLoadMemoryContext.mockResolvedValue("MEMORY_BLOCK");
  mockBuildMemoryTool.mockReturnValue({
    name: "save_memory",
    description: "Merken",
    input_schema: { type: "object", properties: {} },
  });
  mockLoadSeniorAppKnowledge.mockResolvedValue("WISSENSDOKUMENT_SENIOR_APP");
  // Default: ai_onboarding-Consent ist granted, damit existierende
  // Happy-Path-Tests nicht jedes Mal mocken muessen.
  mockCheckCareConsent.mockResolvedValue(true);
  mockGetAiHelpState.mockResolvedValue({
    enabled: true,
    assistanceLevel: "everyday",
  });
});

// ---------------------------------------------------------------------------
// Auth & Validation
// ---------------------------------------------------------------------------

describe("POST /api/ai/onboarding/turn — Auth & Validation", () => {
  it("gibt 401 zurueck wenn nicht authentifiziert", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(401);
  });

  it("gibt 400 zurueck bei ungueltigem JSON", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeReq("kein-json"));
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck wenn userInput fehlt", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck wenn userInput leer ist", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "" }));
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck wenn userInput nur whitespace ist", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "   " }));
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck wenn messages kein Array ist", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: "nicht-array", userInput: "Hallo" }),
    );
    expect(res.status).toBe(400);
  });

  it("akzeptiert leeres messages-Array als erste Nachricht", async () => {
    mockGetProvider.mockReturnValue(makeProvider(textResponse("Guten Tag.")));

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Consent-Check (Codex-Review BLOCKER F6.1)
// ---------------------------------------------------------------------------

describe("POST /api/ai/onboarding/turn — Consent-Check ai_onboarding", () => {
  it("gibt 503 ai_disabled zurueck wenn KI-Hilfe in den Nutzereinstellungen ausgeschaltet ist", async () => {
    mockGetAiHelpState.mockResolvedValue({ enabled: false });
    mockGetProvider.mockReturnValue(makeProvider(textResponse("soll nicht laufen")));

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toMatch(/ausgeschaltet|ai_disabled|KI/i);
    expect(mockLoadMemoryContext).not.toHaveBeenCalled();
    expect(mockGetProvider).not.toHaveBeenCalled();
  });

  it("gibt 403 consent_required zurueck wenn ai_onboarding nicht granted", async () => {
    mockCheckCareConsent.mockResolvedValue(false);

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toMatch(/einwilligung|consent|zustimmung/i);
  });

  it("ruft checkCareConsent mit user.id und 'ai_onboarding' auf", async () => {
    mockGetProvider.mockReturnValue(makeProvider(textResponse("ok")));

    const { POST } = await import("../route");
    await POST(makeReq({ messages: [], userInput: "Hallo" }));

    expect(mockCheckCareConsent).toHaveBeenCalledWith(
      mockSupabase,
      "user-senior-001",
      "ai_onboarding",
    );
  });

  it("ruft NICHT loadMemoryContext oder getProvider auf wenn Consent fehlt", async () => {
    mockCheckCareConsent.mockResolvedValue(false);

    const { POST } = await import("../route");
    await POST(makeReq({ messages: [], userInput: "Hallo" }));

    expect(mockLoadMemoryContext).not.toHaveBeenCalled();
    expect(mockGetProvider).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AI_PROVIDER=off
// ---------------------------------------------------------------------------

describe("POST /api/ai/onboarding/turn — Provider Off", () => {
  it("gibt 503 zurueck wenn getProvider AIProviderError wirft", async () => {
    mockGetProvider.mockImplementation(() => {
      throw new AIProviderError("off", "AI_PROVIDER=off");
    });

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toMatch(/deaktiviert|ai_disabled|KI/i);
  });

  it("gibt 503 zurueck wenn provider.chat AIProviderError wirft", async () => {
    mockGetProvider.mockReturnValue({
      name: "claude",
      chat: vi
        .fn()
        .mockRejectedValue(new AIProviderError("claude", "no api key")),
    } as unknown as AIProvider);

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// Happy-Path
// ---------------------------------------------------------------------------

describe("POST /api/ai/onboarding/turn — Happy-Path", () => {
  it("gibt assistant_text + stop_reason zurueck", async () => {
    mockGetProvider.mockReturnValue(
      makeProvider(textResponse("Willkommen bei Nachbar.")),
    );

    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: [], userInput: "Hallo, ich bin neu." }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.assistant_text).toBe("Willkommen bei Nachbar.");
    expect(data.stop_reason).toBe("end_turn");
    expect(data.tool_results).toEqual([]);
  });

  it("uebergibt System-Prompt mit Wissensdokument UND Memory-Block an Provider", async () => {
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    await POST(makeReq({ messages: [], userInput: "Hallo" }));

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.system).toContain("WISSENSDOKUMENT_SENIOR_APP");
    expect(callArgs.system).toContain("MEMORY_BLOCK");
  });

  it("uebergibt userInput als letzte User-Nachricht an Provider", async () => {
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    await POST(
      makeReq({
        messages: [
          { role: "user", content: "Frueher" },
          { role: "assistant", content: "Antwort" },
        ],
        userInput: "Neuer Input",
      }),
    );

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.messages).toHaveLength(3);
    expect(callArgs.messages[2]).toEqual({
      role: "user",
      content: "Neuer Input",
    });
  });

  it("setzt cache_control.system=true (C5a, F7 rename 2026-04-20)", async () => {
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    await POST(makeReq({ messages: [], userInput: "Hallo" }));

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.cache_control).toEqual({ system: true });
  });

  it("uebergibt save_memory Tool an Provider", async () => {
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    await POST(makeReq({ messages: [], userInput: "Hallo" }));

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.tools).toBeDefined();
    expect(callArgs.tools[0].name).toBe("save_memory");
  });

  it("laedt Memory-Kontext fuer den userInput (nicht fuer History)", async () => {
    mockGetProvider.mockReturnValue(makeProvider(textResponse("ok")));

    const { POST } = await import("../route");
    await POST(
      makeReq({
        messages: [{ role: "user", content: "alt" }],
        userInput: "neuer Kontext",
      }),
    );

    expect(mockLoadMemoryContext).toHaveBeenCalledWith(
      mockSupabase,
      mockUser.id,
      "neuer Kontext",
      "plus_chat",
    );
  });

  it("toleriert Fehler in loadMemoryContext (Fallback: kein Memory-Block)", async () => {
    mockLoadMemoryContext.mockRejectedValue(new Error("DB down"));
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(200);

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.system).toContain("WISSENSDOKUMENT_SENIOR_APP");
    expect(callArgs.system).not.toContain("MEMORY_BLOCK");
  });

  it("verwendet fuer Basis keinen Memory-Kontext und kein Memory-Tool", async () => {
    mockGetAiHelpState.mockResolvedValue({
      enabled: true,
      assistanceLevel: "basic",
    });
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(200);

    expect(mockLoadMemoryContext).not.toHaveBeenCalled();

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.max_tokens).toBe(512);
    expect(callArgs.tools).toBeUndefined();
    expect(callArgs.system).toContain("WISSENSDOKUMENT_SENIOR_APP");
    expect(callArgs.system).toMatch(/basis/i);
    expect(callArgs.system).not.toContain("MEMORY_BLOCK");
  });

  it("verwendet fuer Alltag Memory-Kontext und Memory-Tool mit hoeherem Token-Limit", async () => {
    mockGetAiHelpState.mockResolvedValue({
      enabled: true,
      assistanceLevel: "everyday",
    });
    const provider = makeProvider(textResponse("ok"));
    mockGetProvider.mockReturnValue(provider);

    const { POST } = await import("../route");
    const res = await POST(makeReq({ messages: [], userInput: "Hallo" }));
    expect(res.status).toBe(200);

    expect(mockLoadMemoryContext).toHaveBeenCalledWith(
      mockSupabase,
      mockUser.id,
      "Hallo",
      "plus_chat",
    );

    const callArgs = (provider.chat as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.max_tokens).toBe(1024);
    expect(callArgs.tools).toBeDefined();
    expect(callArgs.tools[0].name).toBe("save_memory");
    expect(callArgs.system).toContain("MEMORY_BLOCK");
    expect(callArgs.system).toMatch(/alltag/i);
  });
});

// ---------------------------------------------------------------------------
// Tool-Call-Flow
// ---------------------------------------------------------------------------

describe("POST /api/ai/onboarding/turn — Tool-Call-Flow", () => {
  it("fuehrt save_memory-Tool-Call aus und gibt Tool-Result in Response", async () => {
    mockGetProvider.mockReturnValue(
      makeProvider(
        toolResponse(
          [
            {
              name: "save_memory",
              input: {
                category: "profile",
                key: "name",
                value: "Hans",
                confidence: 0.9,
                needs_confirmation: false,
              },
            },
          ],
          "Ich merke mir Ihren Namen.",
        ),
      ),
    );
    mockSaveMemoryToolHandler.mockResolvedValue({
      ok: true,
      mode: "save",
      factId: "fact-abc",
      category: "profile",
      key: "name",
    });

    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: [], userInput: "Ich heisse Hans." }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.assistant_text).toBe("Ich merke mir Ihren Namen.");
    expect(data.tool_results).toHaveLength(1);
    expect(data.tool_results[0].ok).toBe(true);
    expect(data.tool_results[0].mode).toBe("save");
    expect(data.tool_results[0].factId).toBe("fact-abc");

    expect(mockSaveMemoryToolHandler).toHaveBeenCalledTimes(1);
    // Scope-Kontext aus Request-Auth abgeleitet (Welle C: Senior-only)
    const handlerCall = mockSaveMemoryToolHandler.mock.calls[0];
    expect(handlerCall[1].actor.userId).toBe(mockUser.id);
    expect(handlerCall[1].actor.role).toBe("senior");
    expect(handlerCall[1].targetUserId).toBe(mockUser.id);
  });

  it("liefert confirm-Mode-Result bei needs_confirmation=true", async () => {
    mockGetProvider.mockReturnValue(
      makeProvider(
        toolResponse(
          [
            {
              name: "save_memory",
              input: {
                category: "care_need",
                key: "mobilitaet",
                value: "Rollator",
                confidence: 0.9,
                needs_confirmation: true,
              },
            },
          ],
          "Soll ich mir das merken?",
        ),
      ),
    );
    mockSaveMemoryToolHandler.mockResolvedValue({
      ok: true,
      mode: "confirm",
      factId: null,
      category: "care_need",
      key: "mobilitaet",
      value: "Rollator",
    });

    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: [], userInput: "Ich nutze einen Rollator." }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tool_results[0].mode).toBe("confirm");
    expect(data.tool_results[0].value).toBe("Rollator");
  });

  it("ignoriert unbekannte Tools (liefert validation_error-Result)", async () => {
    mockGetProvider.mockReturnValue(
      makeProvider(toolResponse([{ name: "unknown_tool", input: {} }], "")),
    );

    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: [], userInput: "Tu etwas Komisches" }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tool_results).toHaveLength(1);
    expect(data.tool_results[0].ok).toBe(false);
    expect(data.tool_results[0].reason).toBe("validation_error");
    expect(mockSaveMemoryToolHandler).not.toHaveBeenCalled();
  });

  it("fuehrt mehrere Tool-Calls in einer Response aus", async () => {
    mockGetProvider.mockReturnValue(
      makeProvider(
        toolResponse(
          [
            {
              name: "save_memory",
              input: {
                category: "profile",
                key: "name",
                value: "Hans",
                confidence: 0.9,
                needs_confirmation: false,
              },
            },
            {
              name: "save_memory",
              input: {
                category: "profile",
                key: "anrede",
                value: "Sie",
                confidence: 0.9,
                needs_confirmation: false,
              },
            },
          ],
          "Notiert.",
        ),
      ),
    );
    mockSaveMemoryToolHandler
      .mockResolvedValueOnce({
        ok: true,
        mode: "save",
        factId: "f1",
        category: "profile",
        key: "name",
      })
      .mockResolvedValueOnce({
        ok: true,
        mode: "save",
        factId: "f2",
        category: "profile",
        key: "anrede",
      });

    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: [], userInput: "Hans, siezen" }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tool_results).toHaveLength(2);
    expect(mockSaveMemoryToolHandler).toHaveBeenCalledTimes(2);
  });

  it("gibt 500 zurueck wenn Provider zu viele Tool-Calls zurueckgibt (>3)", async () => {
    const tooMany = Array.from({ length: 4 }).map((_, i) => ({
      name: "save_memory",
      input: {
        category: "profile",
        key: `k${i}`,
        value: `v${i}`,
        confidence: 0.9,
        needs_confirmation: false,
      },
    }));
    mockGetProvider.mockReturnValue(
      makeProvider(toolResponse(tooMany, "zu viele")),
    );

    const { POST } = await import("../route");
    const res = await POST(
      makeReq({ messages: [], userInput: "Alles auf einmal" }),
    );
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toMatch(/tool.*limit|loop.*overflow|zu viele Tool/i);
    // Kein save ausgeloest bei Overflow
    expect(mockSaveMemoryToolHandler).not.toHaveBeenCalled();
  });
});
