// __tests__/api/register-complete-postal-auto.test.ts
// Tests fuer A3-Pivot Integration: Wenn ein User mit voller Adresse + PLZ
// + Stadt registriert, aber PostGIS keinen Pilot-Quartier-Match liefert
// (Adresse ausserhalb Bad Saeckingen), soll der Service:
//   1. PLZ-Auto-Quartier finden oder anlegen (Mig 178, scope='postal')
//   2. Den Haushalt mit dieser quarter_id verknuepfen
//   3. Bei isNew=true den User als quarter_admin eintragen
//
// Pre-Check: lib/quarters/postal-auto.ts existiert (GREEN), Mig 178 file-first.
// quarter_admins-Tabelle existiert seit Mig 051.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockListUsers = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
        listUsers: mockListUsers,
      },
    },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/notifications-server", () => ({
  safeInsertNotification: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/invite-codes", () => ({
  generateSecureCode: vi.fn().mockReturnValue("AUTO-CODE-1"),
  generateTempPassword: vi.fn().mockReturnValue("temp-pw"),
  normalizeCode: vi.fn((c: string) => c?.toUpperCase().replace(/[-\s]/g, "")),
}));

vi.mock("@/lib/security/traps/honeypot-field", () => ({
  checkHoneypotField: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/security/traps/trap-utils", () => ({
  buildClientKeysNode: vi.fn().mockReturnValue({}),
}));

// PostGIS-Cluster gibt null zurueck (Adresse ausserhalb Pilot-Gebiet)
vi.mock("@/lib/geo/quarter-clustering", () => ({
  assignUserToQuarter: vi.fn().mockResolvedValue(null),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/register/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/register/complete — PLZ-Auto-Quartier (A3-Pivot)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.PILOT_AUTO_VERIFY = "true";
  });

  it("legt PLZ-Quartier an + Haushalt + macht Founder zum quarter_admin", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "founder-1" } },
      error: null,
    });

    // Track was wann eingefuegt wird
    const quarterInsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "new-q-22301", name: "Quartier 22301 Hamburg" },
          error: null,
        }),
      }),
    });
    const quarterAdminInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const householdInsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "hh-hamburg-1" },
          error: null,
        }),
      }),
    });
    const householdSearchMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const memberInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const profileUpsertSpy = vi.fn().mockResolvedValue({ error: null });

    // Quarter-Lookup: kein bestehendes Auto-Quartier in 22301
    const quarterSelectMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quarters") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: quarterSelectMaybeSingle,
              }),
            }),
          }),
          insert: quarterInsertSpy,
        };
      }
      if (table === "quarter_admins") {
        return { insert: quarterAdminInsertSpy };
      }
      if (table === "households") {
        return {
          insert: householdInsertSpy,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: householdSearchMaybeSingle,
              }),
            }),
          }),
        };
      }
      if (table === "users") return { upsert: profileUpsertSpy };
      if (table === "household_members") return { insert: memberInsertSpy };
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const { POST } = await import("@/app/api/register/complete/route");
    const res = await POST(
      makeRequest({
        email: "founder@example.com",
        displayName: "Anna Hamburg",
        uiMode: "active",
        verificationMethod: "address_manual",
        streetName: "Eppendorfer Landstrasse",
        houseNumber: "1",
        postalCode: "22301",
        city: "Hamburg",
        lat: 53.59,
        lng: 9.99,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe("founder-1");

    // Quartier wurde angelegt mit korrekten Feldern
    expect(quarterInsertSpy).toHaveBeenCalledTimes(1);
    const qArg = quarterInsertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(qArg.postal_code).toBe("22301");
    expect(qArg.city).toBe("Hamburg");
    expect(qArg.auto_created).toBe(true);
    expect(qArg.scope).toBe("postal");
    expect(qArg.name).toBe("Quartier 22301 Hamburg");

    // Haushalt mit der neuen Quarter-ID
    expect(householdInsertSpy).toHaveBeenCalledTimes(1);
    const hhArg = householdInsertSpy.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(hhArg.quarter_id).toBe("new-q-22301");

    // Founder wurde quarter_admin (weil Quartier neu war)
    expect(quarterAdminInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "founder-1",
        quarter_id: "new-q-22301",
      }),
    );
  });

  it("nutzt bestehendes PLZ-Quartier wenn vorhanden, KEIN quarter_admin-Insert (zweiter User)", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "second-user" } },
      error: null,
    });

    const quarterInsertSpy = vi.fn();
    const quarterAdminInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const householdInsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "hh-hamburg-2" },
          error: null,
        }),
      }),
    });
    const memberInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const profileUpsertSpy = vi.fn().mockResolvedValue({ error: null });

    // Quarter existiert schon
    const quarterSelectMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "existing-q-22301", name: "Quartier 22301 Hamburg" },
      error: null,
    });
    const householdSearchMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quarters") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: quarterSelectMaybeSingle,
              }),
            }),
          }),
          insert: quarterInsertSpy,
        };
      }
      if (table === "quarter_admins") {
        return { insert: quarterAdminInsertSpy };
      }
      if (table === "households") {
        return {
          insert: householdInsertSpy,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: householdSearchMaybeSingle,
              }),
            }),
          }),
        };
      }
      if (table === "users") return { upsert: profileUpsertSpy };
      if (table === "household_members") return { insert: memberInsertSpy };
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const { POST } = await import("@/app/api/register/complete/route");
    await POST(
      makeRequest({
        email: "second@example.com",
        displayName: "Tom Zweiter",
        verificationMethod: "address_manual",
        streetName: "Beispielweg",
        houseNumber: "5",
        postalCode: "22301",
        city: "Hamburg",
        lat: 53.6,
        lng: 9.98,
      }),
    );

    // Kein neues Quartier
    expect(quarterInsertSpy).not.toHaveBeenCalled();
    // Aber Haushalt mit der bestehenden Quartier-ID
    const hhArg = householdInsertSpy.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(hhArg.quarter_id).toBe("existing-q-22301");
    // Kein quarter_admin-Eintrag fuer den zweiten User
    expect(quarterAdminInsertSpy).not.toHaveBeenCalled();
  });
});
