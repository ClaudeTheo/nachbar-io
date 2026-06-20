import { describe, it, expect, vi } from "vitest";
import { shouldAutoAnswerIncomingCall } from "@/lib/video-calls/incoming-auto-answer";

// Sequenzieller from()-Mock (Muster wie __tests__/api/device-contacts.test.ts).
function mockSupabase(linkRow: unknown) {
  const chain: Record<string, unknown> = {};
  const p = Promise.resolve({ data: linkRow, error: null });
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(p);
  return { from: vi.fn().mockReturnValue(chain) };
}

const SENIOR = "u-senior";
const CALLER = "u-caregiver";

function link(overrides: Record<string, unknown> = {}) {
  return {
    auto_answer_allowed: true,
    auto_answer_start: "08:00:00",
    auto_answer_end: "20:00:00",
    auto_answer_senior_consented_at: "2026-01-01T00:00:00Z",
    revoked_at: null,
    ...overrides,
  };
}

describe("shouldAutoAnswerIncomingCall", () => {
  it("false wenn keine aktive Verbindung zum Anrufer", async () => {
    const sb = mockSupabase(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await shouldAutoAnswerIncomingCall(sb as any, SENIOR, CALLER, "12:00")).toBe(false);
  });

  it("true bei beidseitigem Opt-in im Zeitfenster", async () => {
    const sb = mockSupabase(link());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await shouldAutoAnswerIncomingCall(sb as any, SENIOR, CALLER, "12:00")).toBe(true);
  });

  it("false ohne Senior-Einwilligung", async () => {
    const sb = mockSupabase(link({ auto_answer_senior_consented_at: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await shouldAutoAnswerIncomingCall(sb as any, SENIOR, CALLER, "12:00")).toBe(false);
  });

  it("false wenn der Angehoerige es nicht erlaubt", async () => {
    const sb = mockSupabase(link({ auto_answer_allowed: false }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await shouldAutoAnswerIncomingCall(sb as any, SENIOR, CALLER, "12:00")).toBe(false);
  });

  it("false ausserhalb des Zeitfensters", async () => {
    const sb = mockSupabase(link());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await shouldAutoAnswerIncomingCall(sb as any, SENIOR, CALLER, "23:30")).toBe(false);
  });
});
