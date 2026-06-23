import { describe, it, expect, vi } from "vitest";
import {
  confirmSeniorConsent,
  listPendingSeniorConsents,
} from "@/lib/family-setup/senior-consent.service";

// W5 / A2:4: Senior bestätigt die Einwilligung (consent_status pending_senior_confirm -> active).
// Läuft über den ADMIN-Client (service_role), weil der CL-1-Trigger (Mig 20260618130000)
// consent_status für Nicht-service_role sticky macht. Sicherheits-Auflagen:
//  - IDOR: nur der resident (Senior) des Links darf bestätigen.
//  - Nur ein wirklich PENDING-Link wird auf active gesetzt.
//  - Audit jeder Bestätigung in audit_log.

const LINK = "33333333-3333-3333-3333-333333333333";

// Sequenzieller from()-Mock (Muster wie senior-auto-answer.service.test.ts), erweitert um insert.
function createMockAdmin(results: Array<{ data: unknown; error: unknown }>) {
  let i = 0;
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown }> = [];
  const admin = {
    inserts,
    updates,
    from: vi.fn().mockImplementation((table: string) => {
      const res = results[i] ?? { data: null, error: null };
      i++;
      const p = Promise.resolve(res);
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockImplementation((payload: unknown) => {
        updates.push({ table, payload });
        return chain;
      });
      chain.insert = vi.fn().mockImplementation((payload: unknown) => {
        inserts.push({ table, payload });
        return p;
      });
      chain.maybeSingle = vi.fn().mockReturnValue(p);
      chain.single = vi.fn().mockReturnValue(p);
      chain.then = p.then.bind(p);
      return chain;
    }),
  };
  return admin;
}

describe("confirmSeniorConsent", () => {
  it("404 wenn der Link nicht existiert (kein Update, kein Audit)", async () => {
    const admin = createMockAdmin([{ data: null, error: null }]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      confirmSeniorConsent(admin as any, "u-senior", LINK),
    ).rejects.toMatchObject({ status: 404 });
    expect(admin.updates).toHaveLength(0);
    expect(admin.inserts).toHaveLength(0);
  });

  it("403 (IDOR) wenn der Link einem ANDEREN Bewohner gehört", async () => {
    const admin = createMockAdmin([
      { data: { id: LINK, resident_id: "someone-else", consent_status: "pending_senior_confirm", revoked_at: null }, error: null },
    ]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      confirmSeniorConsent(admin as any, "u-senior", LINK),
    ).rejects.toMatchObject({ status: 403 });
    expect(admin.updates).toHaveLength(0);
  });

  it("409 wenn der Link nicht (mehr) pending ist", async () => {
    const admin = createMockAdmin([
      { data: { id: LINK, resident_id: "u-senior", consent_status: "active", revoked_at: null }, error: null },
    ]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      confirmSeniorConsent(admin as any, "u-senior", LINK),
    ).rejects.toMatchObject({ status: 409 });
    expect(admin.updates).toHaveLength(0);
  });

  it("setzt consent_status=active und schreibt NUR diese Spalte + Audit", async () => {
    const admin = createMockAdmin([
      { data: { id: LINK, resident_id: "u-senior", consent_status: "pending_senior_confirm", revoked_at: null }, error: null },
      { data: { id: LINK }, error: null },
      { data: null, error: null },
    ]);
    const result = await confirmSeniorConsent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin as any,
      "u-senior",
      LINK,
    );
    expect(result).toEqual({ consentStatus: "active" });
    expect(admin.updates).toHaveLength(1);
    expect(admin.updates[0]).toEqual({ table: "caregiver_links", payload: { consent_status: "active" } });
    expect(admin.inserts).toHaveLength(1);
    expect(admin.inserts[0].table).toBe("audit_log");
    expect(admin.inserts[0].payload).toMatchObject({
      action: "senior_consent_confirmed",
      actor_id: "u-senior",
      target_type: "caregiver_link",
      target_id: LINK,
      metadata: { from: "pending_senior_confirm", to: "active" },
    });
  });
});

describe("listPendingSeniorConsents", () => {
  it("mappt offene Links auf {linkId, caregiverName, relationshipType}", async () => {
    const admin = createMockAdmin([
      {
        data: [
          { id: LINK, relationship_type: "child", caregiver: { display_name: "Anna" } },
          { id: "44444444-4444-4444-4444-444444444444", relationship_type: null, caregiver: null },
        ],
        error: null,
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listPendingSeniorConsents(admin as any, "u-senior");
    expect(result).toEqual([
      { linkId: LINK, caregiverName: "Anna", relationshipType: "child" },
      { linkId: "44444444-4444-4444-4444-444444444444", caregiverName: "Ihr Angehöriger", relationshipType: null },
    ]);
  });

  it("gibt [] bei Fehler zurück (kein Throw)", async () => {
    const admin = createMockAdmin([{ data: null, error: { message: "boom" } }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listPendingSeniorConsents(admin as any, "u-senior");
    expect(result).toEqual([]);
  });
});
