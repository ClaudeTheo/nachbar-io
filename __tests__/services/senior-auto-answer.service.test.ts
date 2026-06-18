import { describe, it, expect, vi, beforeEach } from "vitest";

// Welle AA-3: setAutoAnswerConsent — die sicherheitskritische Logik.
// Deckt die zwei Mini-Audit-HIGH-Auflagen ab:
//  - AA-RLS-3 (IDOR): nur der resident des Links darf die Einwilligung setzen.
//  - AA-AUDIT-1: jeder Consent-Wechsel schreibt einen care_audit_log-Eintrag.

const writeAuditLogMock = vi.fn();
vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLogMock(...args),
}));

import { setAutoAnswerConsent } from "@/modules/care/services/senior-auto-answer.service";

const LINK = "22222222-2222-2222-2222-222222222222";

// Sequenzieller from()-Mock (Muster wie __tests__/api/device-contacts.test.ts).
function createMockAdmin(
  results: Array<{ data: unknown; error: unknown }>,
) {
  let i = 0;
  return {
    from: vi.fn().mockImplementation(() => {
      const res = results[i] ?? { data: null, error: null };
      i++;
      const chain: Record<string, unknown> = {};
      const p = Promise.resolve(res);
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.maybeSingle = vi.fn().mockReturnValue(p);
      chain.single = vi.fn().mockReturnValue(p);
      chain.then = p.then.bind(p);
      return chain;
    }),
  };
}

describe("setAutoAnswerConsent", () => {
  beforeEach(() => {
    writeAuditLogMock.mockReset();
  });

  it("404 wenn der Link nicht existiert (kein Audit)", async () => {
    const admin = createMockAdmin([{ data: null, error: null }]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAutoAnswerConsent(admin as any, "u-senior", LINK, true),
    ).rejects.toMatchObject({ status: 404 });
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("404 wenn der Link widerrufen ist", async () => {
    const admin = createMockAdmin([
      {
        data: { id: LINK, resident_id: "u-senior", revoked_at: "2026-01-01T00:00:00Z" },
        error: null,
      },
    ]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAutoAnswerConsent(admin as any, "u-senior", LINK, true),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("403 (IDOR) wenn der Link einem ANDEREN Bewohner gehoert — kein Audit", async () => {
    const admin = createMockAdmin([
      {
        data: { id: LINK, resident_id: "someone-else", revoked_at: null },
        error: null,
      },
    ]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAutoAnswerConsent(admin as any, "u-senior", LINK, true),
    ).rejects.toMatchObject({ status: 403 });
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("consent=true setzt den Zeitstempel und schreibt einen Audit-Eintrag", async () => {
    const admin = createMockAdmin([
      { data: { id: LINK, resident_id: "u-senior", revoked_at: null }, error: null },
      { data: { id: LINK }, error: null },
    ]);
    const result = await setAutoAnswerConsent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin as any,
      "u-senior",
      LINK,
      true,
    );
    expect(result.consent).toBe(true);
    expect(result.consentedAt).not.toBeNull();
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        seniorId: "u-senior",
        actorId: "u-senior",
        eventType: "auto_answer_consent_changed",
        referenceType: "caregiver_link",
        referenceId: LINK,
        metadata: { consent: true },
      }),
    );
  });

  it("consent=false setzt NULL und schreibt einen Audit-Eintrag", async () => {
    const admin = createMockAdmin([
      { data: { id: LINK, resident_id: "u-senior", revoked_at: null }, error: null },
      { data: { id: LINK }, error: null },
    ]);
    const result = await setAutoAnswerConsent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin as any,
      "u-senior",
      LINK,
      false,
    );
    expect(result.consentedAt).toBeNull();
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ metadata: { consent: false } }),
    );
  });
});
