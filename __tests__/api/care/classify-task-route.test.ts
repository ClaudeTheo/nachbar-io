import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockCanUsePersonalAi = vi.fn();
const mockClassifyTaskFromVoice = vi.fn();
const mockConsumeAiDailyUserLimit = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  errorResponse: (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), { status }),
}));

vi.mock("@/lib/ai/user-settings", () => ({
  AI_HELP_DISABLED_MESSAGE: "KI-Hilfe ist ausgeschaltet.",
  canUsePersonalAi: (...args: unknown[]) => mockCanUsePersonalAi(...args),
}));

vi.mock("@/lib/care/voice-classify", () => ({
  classifyTaskFromVoice: (...args: unknown[]) => mockClassifyTaskFromVoice(...args),
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  consumeAiDailyUserLimit: (...args: unknown[]) => mockConsumeAiDailyUserLimit(...args),
  AI_DAILY_USER_LIMIT: 100,
}));

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/care/classify-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/care/classify-task", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockCanUsePersonalAi.mockReset();
    mockClassifyTaskFromVoice.mockReset();
    mockConsumeAiDailyUserLimit.mockReset();

    mockRequireAuth.mockResolvedValue({
      user: { id: "user-1" },
      supabase: {},
    });
    mockCanUsePersonalAi.mockResolvedValue(true);
    // Default: Rate-Limit erlaubt
    mockConsumeAiDailyUserLimit.mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
    });
    mockClassifyTaskFromVoice.mockResolvedValue({
      category: "shopping",
      title: "Einkaufen",
      description: "",
    });
  });

  it("gibt 503 ai_disabled zurueck wenn KI-Hilfe ausgeschaltet ist und klassifiziert nicht", async () => {
    mockCanUsePersonalAi.mockResolvedValueOnce(false);

    const { POST } = await import("@/app/api/care/classify-task/route");
    const res = await POST(makeReq({ text: "Ich brauche Hilfe beim Einkaufen" }));
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toMatch(/KI-Hilfe ist ausgeschaltet/i);
    expect(mockClassifyTaskFromVoice).not.toHaveBeenCalled();
  });

  it("gibt 429 zurueck wenn KI-Tageslimit erreicht ist (DoW-Schutz)", async () => {
    mockConsumeAiDailyUserLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 100,
      remaining: 0,
    });

    const { POST } = await import("@/app/api/care/classify-task/route");
    const res = await POST(makeReq({ text: "Hilfe beim Einkaufen" }));
    expect(res.status).toBe(429);

    const data = await res.json();
    expect(data.error).toMatch(/Tageslimit erreicht/i);
    expect(mockClassifyTaskFromVoice).not.toHaveBeenCalled();
  });

  it("gibt 503 zurueck wenn Rate-Limit-Backend nicht verfuegbar (fail-closed)", async () => {
    mockConsumeAiDailyUserLimit.mockResolvedValueOnce({
      allowed: false,
      unavailable: true,
      limit: 100,
      remaining: 0,
    });

    const { POST } = await import("@/app/api/care/classify-task/route");
    const res = await POST(makeReq({ text: "Hilfe" }));
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toMatch(/KI-Nutzungsschutz/i);
    expect(mockClassifyTaskFromVoice).not.toHaveBeenCalled();
  });

  it("klassifiziert wenn alles ok (Rate-Limit erlaubt)", async () => {
    const { POST } = await import("@/app/api/care/classify-task/route");
    const res = await POST(makeReq({ text: "Brot kaufen" }));
    expect(res.status).toBe(200);
    expect(mockConsumeAiDailyUserLimit).toHaveBeenCalledWith({ userId: "user-1" });
    expect(mockClassifyTaskFromVoice).toHaveBeenCalledWith("Brot kaufen");
  });
});
