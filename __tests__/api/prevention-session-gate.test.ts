// Tests fuer die KI-Schutzgates auf /api/prevention/session (Befund D5:2):
// Einwilligung + AI_PROVIDER_OFF + Tageslimit — aber die deterministische
// Krisen-Erkennung (rote Signalwoerter -> 112-Antwort ohne KI-Call) bleibt
// IMMER erreichbar, auch ohne Einwilligung.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();

function chainable() {
  const obj: Record<string, unknown> = {};
  obj.select = vi.fn(() => obj);
  obj.eq = vi.fn(() => obj);
  obj.single = mockSingle;
  obj.insert = mockInsert;
  return obj;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => chainable()),
  }),
}));

const mockCanUsePersonalAi = vi.fn();
vi.mock("@/lib/ai/user-settings", () => ({
  AI_HELP_DISABLED_MESSAGE: "Die KI-Hilfe ist zurzeit ausgeschaltet.",
  canUsePersonalAi: (...args: unknown[]) => mockCanUsePersonalAi(...args),
}));

const mockConsumeAiDailyUserLimit = vi.fn();
vi.mock("@/lib/ai/rate-limit", () => ({
  consumeAiDailyUserLimit: (...args: unknown[]) =>
    mockConsumeAiDailyUserLimit(...args),
}));

// generateSessionResponse mocken, detectEscalation aus dem echten Service
// behalten — sonst testen wir nur unseren eigenen Mock
const mockGenerateSessionResponse = vi.fn();
vi.mock("@/modules/praevention/services/ki-session.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/modules/praevention/services/ki-session.service")
  >();
  return {
    ...actual,
    generateSessionResponse: (...args: unknown[]) =>
      mockGenerateSessionResponse(...args),
  };
});

import { POST } from "@/app/api/prevention/session/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/prevention/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  message: "Wie geht die Atemuebung?",
  enrollmentId: "enroll-1",
};

describe("POST /api/prevention/session — KI-Schutzgates (D5:2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // Enrollment- und Kurs-Lookups
    mockSingle.mockResolvedValue({
      data: { id: "enroll-1", user_id: "user-1", course_id: "course-1" },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    mockCanUsePersonalAi.mockResolvedValue(true);
    mockConsumeAiDailyUserLimit.mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
    });
    mockGenerateSessionResponse.mockResolvedValue({
      reply: "Gerne, atmen Sie ruhig ein.",
      escalationLevel: "green",
      suggestedExercise: null,
      shouldEndSession: false,
    });
  });

  it("gibt 503 ohne KI-Einwilligung — kein Provider-Call", async () => {
    mockCanUsePersonalAi.mockResolvedValueOnce(false);

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.aiDisabled).toBe(true);
    expect(mockGenerateSessionResponse).not.toHaveBeenCalled();
    expect(mockConsumeAiDailyUserLimit).not.toHaveBeenCalled();
  });

  it("gibt 429 wenn das KI-Tageslimit erreicht ist", async () => {
    mockConsumeAiDailyUserLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 100,
      remaining: 0,
    });

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(429);
    expect(mockGenerateSessionResponse).not.toHaveBeenCalled();
  });

  it("laesst die Sitzung mit Einwilligung + Limit normal durch", async () => {
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(mockCanUsePersonalAi).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
    );
    expect(mockConsumeAiDailyUserLimit).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(mockGenerateSessionResponse).toHaveBeenCalled();
  });

  it("Krisen-Pfad: rote Signalwoerter umgehen Consent-Gate und Limit (112-Antwort bleibt erreichbar)", async () => {
    mockCanUsePersonalAi.mockResolvedValue(false);
    mockGenerateSessionResponse.mockResolvedValueOnce({
      reply: "Bitte rufen Sie jetzt den Notruf an: 112.",
      escalationLevel: "red",
      suggestedExercise: null,
      shouldEndSession: true,
    });

    const res = await POST(
      makeRequest({ ...VALID_BODY, message: "Ich will nicht mehr leben" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toContain("112");
    // Gates wurden fuer den Krisen-Pfad NICHT angewendet
    expect(mockCanUsePersonalAi).not.toHaveBeenCalled();
    expect(mockConsumeAiDailyUserLimit).not.toHaveBeenCalled();
    // Eskalation wird weiterhin geloggt
    expect(mockInsert).toHaveBeenCalled();
  });
});
