import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockCanUsePersonalAi,
  mockConsumeSessionLimit,
  mockFetch,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockCanUsePersonalAi: vi.fn(),
  mockConsumeSessionLimit: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: mockRequireAuth,
  unauthorizedResponse: () => Response.json({ error: "unauthorized" }, { status: 401 }),
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
}));

vi.mock("@/lib/ai/user-settings", () => ({
  AI_HELP_DISABLED_MESSAGE: "KI-Hilfe ist ausgeschaltet.",
  canUsePersonalAi: mockCanUsePersonalAi,
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  consumeRealtimeVoiceSessionLimit: mockConsumeSessionLimit,
}));

global.fetch = mockFetch;

describe("POST /api/voice/realtime/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("REALTIME_VOICE_ENABLED", "1");
    mockRequireAuth.mockResolvedValue({
      user: { id: "user-1" },
      supabase: { from: vi.fn() },
    });
    mockCanUsePersonalAi.mockResolvedValue(true);
    mockConsumeSessionLimit.mockResolvedValue({
      allowed: true,
      limit: 8,
      remaining: 7,
    });
    mockFetch.mockResolvedValue(
      Response.json({ value: "ephemeral-secret", expires_at: 123456 }),
    );
  });

  it("bleibt ohne Founder-Flag fail-closed bei 503", async () => {
    vi.stubEnv("REALTIME_VOICE_ENABLED", "0");
    const { POST } = await import("@/app/api/voice/realtime/session/route");

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mockRequireAuth).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("verlangt einen angemeldeten Nutzer", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/voice/realtime/session/route");

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("mintet ohne bestehende KI-Einwilligung kein Token", async () => {
    mockCanUsePersonalAi.mockResolvedValue(false);
    const { POST } = await import("@/app/api/voice/realtime/session/route");

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("blockiert fail-closed wenn das Kostenlimit nicht verfuegbar ist", async () => {
    mockConsumeSessionLimit.mockResolvedValue({
      allowed: false,
      unavailable: true,
      limit: 8,
      remaining: 0,
    });
    const { POST } = await import("@/app/api/voice/realtime/session/route");

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("begrenzt auf acht Sitzungen pro Stunde und Nutzer", async () => {
    mockConsumeSessionLimit.mockResolvedValue({
      allowed: false,
      limit: 8,
      remaining: 0,
    });
    const { POST } = await import("@/app/api/voice/realtime/session/route");

    const response = await POST();

    expect(response.status).toBe(429);
    expect(mockConsumeSessionLimit).toHaveBeenCalledWith({ userId: "user-1" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("mintet ein kurzlebiges marin-Token mit semantic VAD und Barge-in", async () => {
    const { POST } = await import("@/app/api/voice/realtime/session/route");

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      clientSecret: "ephemeral-secret",
      expiresAt: 123456,
      model: "gpt-realtime-mini",
      maxSessionSeconds: 600,
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-openai-key" }),
    );
    const upstreamBody = JSON.parse(String(init.body));
    expect(upstreamBody.expires_after).toEqual({
      anchor: "created_at",
      seconds: 120,
    });
    expect(upstreamBody.session).toEqual(
      expect.objectContaining({
        type: "realtime",
        model: "gpt-realtime-mini",
        instructions: expect.stringMatching(/112[\s\S]*110|110[\s\S]*112/),
        audio: {
          input: {
            transcription: {
              model: "gpt-4o-mini-transcribe",
              language: "de",
            },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "low",
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { voice: "marin" },
        },
      }),
    );
    expect(upstreamBody.session.instructions).toMatch(/keine medizinische Beratung/i);
    expect(upstreamBody.session.instructions).toMatch(/keine personenbezogenen Daten Dritter/i);
  });
});
