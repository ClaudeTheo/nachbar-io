import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

// Welle AA-3: POST /api/senior/auto-answer-consent — duenne Route.
// Auth (401) + Body-Validierung (400) + Delegation an setAutoAnswerConsent.
// Die Ownership-/Audit-Logik wird im Service-Test geprueft.

const mockSupabase = createRouteMockSupabase();
const setAutoAnswerConsentMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({})),
}));

vi.mock("@/modules/care/services/senior-auto-answer.service", () => ({
  setAutoAnswerConsent: (...args: unknown[]) =>
    setAutoAnswerConsentMock(...args),
}));

const LINK = "22222222-2222-2222-2222-222222222222";

function makePost(body?: unknown): NextRequest {
  return new Request("http://localhost/api/senior/auto-answer-consent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/senior/auto-answer-consent", () => {
  beforeEach(() => {
    mockSupabase.reset();
    setAutoAnswerConsentMock.mockReset();
  });

  it("gibt 401 ohne Login zurueck", async () => {
    const { POST } = await import("@/app/api/senior/auto-answer-consent/route");
    const res = await POST(makePost({ caregiverLinkId: LINK, consent: true }));
    expect(res.status).toBe(401);
    expect(setAutoAnswerConsentMock).not.toHaveBeenCalled();
  });

  it("gibt 400 bei fehlendem/ungueltigem Body zurueck", async () => {
    mockSupabase.setUser({ id: "u-senior" });
    const { POST } = await import("@/app/api/senior/auto-answer-consent/route");
    expect((await POST(makePost({ consent: true }))).status).toBe(400); // kein Link
    expect(
      (await POST(makePost({ caregiverLinkId: "kein-uuid", consent: true })))
        .status,
    ).toBe(400); // keine UUID
    expect((await POST(makePost({ caregiverLinkId: LINK }))).status).toBe(400); // consent fehlt
    expect(
      (await POST(makePost({ caregiverLinkId: LINK, consent: "ja" }))).status,
    ).toBe(400); // consent kein boolean
    expect(setAutoAnswerConsentMock).not.toHaveBeenCalled();
  });

  it("delegiert an den Service und gibt dessen Ergebnis zurueck", async () => {
    mockSupabase.setUser({ id: "u-senior" });
    setAutoAnswerConsentMock.mockResolvedValue({
      consent: true,
      consentedAt: "2026-06-18T12:00:00.000Z",
    });
    const { POST } = await import("@/app/api/senior/auto-answer-consent/route");
    const res = await POST(makePost({ caregiverLinkId: LINK, consent: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      consent: true,
      consentedAt: "2026-06-18T12:00:00.000Z",
    });
    expect(setAutoAnswerConsentMock).toHaveBeenCalledWith(
      expect.anything(),
      "u-senior",
      LINK,
      true,
    );
  });
});
