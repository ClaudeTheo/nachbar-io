import { describe, expect, it, vi } from "vitest";
import {
  checkCareConsent,
  getConsentsForUser,
  hasAnyCareConsent,
  CONSENT_FEATURE_TO_API_ROUTES,
} from "@/lib/care/consent";

// Helper: Supabase-Mock erstellen mit korrekter Chainable-API
function mockSupabase(selectResult: { data: unknown; error: unknown }) {
  const terminal = {
    maybeSingle: vi.fn().mockResolvedValue(selectResult),
    limit: vi.fn().mockResolvedValue(selectResult),
  };
  // Jedes .eq() gibt ein Objekt zurueck, das weitere .eq(), .maybeSingle(), .limit() unterstuetzt
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {
    ...terminal,
    eq: vi.fn(),
  };
  // eq gibt immer wieder chainable zurueck
  chainable.eq.mockReturnValue(chainable);
  // select ohne eq gibt auch direkt das Ergebnis (fuer getConsentsForUser mit nur 1x eq)
  const selectFn = vi
    .fn()
    .mockReturnValue({
      ...selectResult,
      eq: vi.fn().mockReturnValue(chainable),
    });
  const fromFn = vi.fn().mockReturnValue({ select: selectFn });
  return { from: fromFn } as unknown as Parameters<
    typeof import("@/lib/care/consent").checkCareConsent
  >[0];
}

describe("checkCareConsent", () => {
  it("gibt true zurueck wenn Consent erteilt", async () => {
    const sb = mockSupabase({ data: { granted: true }, error: null });
    expect(await checkCareConsent(sb, "u1", "sos")).toBe(true);
  });

  it("gibt false zurueck wenn Consent nicht erteilt", async () => {
    const sb = mockSupabase({ data: { granted: false }, error: null });
    expect(await checkCareConsent(sb, "u1", "sos")).toBe(false);
  });

  it("gibt false zurueck wenn kein Eintrag", async () => {
    const sb = mockSupabase({ data: null, error: null });
    expect(await checkCareConsent(sb, "u1", "sos")).toBe(false);
  });

  it("gibt false zurueck bei DB-Fehler", async () => {
    const sb = mockSupabase({ data: null, error: new Error("db error") });
    expect(await checkCareConsent(sb, "u1", "sos")).toBe(false);
  });
});

describe("getConsentsForUser", () => {
  it("gibt Defaults zurueck wenn keine Eintraege", async () => {
    const sb = mockSupabase({ data: [], error: null });
    const result = await getConsentsForUser(sb, "u1");
    expect(result.sos.granted).toBe(false);
    expect(result.checkin.granted).toBe(false);
    expect(result.medications.granted).toBe(false);
    expect(result.care_profile.granted).toBe(false);
    expect(result.emergency_contacts.granted).toBe(false);
  });
});

describe("hasAnyCareConsent", () => {
  it("gibt true zurueck wenn mindestens ein Consent", async () => {
    const sb = mockSupabase({ data: [{ id: "1" }], error: null });
    expect(await hasAnyCareConsent(sb, "u1")).toBe(true);
  });

  it("gibt false zurueck wenn kein Consent", async () => {
    const sb = mockSupabase({ data: [], error: null });
    expect(await hasAnyCareConsent(sb, "u1")).toBe(false);
  });
});

describe("CONSENT_FEATURE_TO_API_ROUTES", () => {
  it("mappt alle 6 Features", () => {
    // ai_onboarding ergaenzt mit Welle C (KI-Assistent Senior-Onboarding)
    expect(Object.keys(CONSENT_FEATURE_TO_API_ROUTES)).toHaveLength(6);
  });
});
