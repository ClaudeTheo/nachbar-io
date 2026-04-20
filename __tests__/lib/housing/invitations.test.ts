import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSecureToken,
  generateInviteCode,
  createHousingInvitation,
  consumeHousingInvitation,
  INVITATION_EXPIRY_DAYS,
} from "@/lib/housing/invitations";

// ============================================================
// generateSecureToken
// ============================================================
describe("generateSecureToken", () => {
  it("liefert 32-stelligen base64url-Token", () => {
    const token = generateSecureToken();
    // base64url: A-Z a-z 0-9 - _ (kein +/= Padding)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it("ist bei jedem Aufruf anders (Kollisionsfreiheit)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) set.add(generateSecureToken());
    expect(set.size).toBe(50);
  });
});

// ============================================================
// generateInviteCode
// ============================================================
describe("generateInviteCode", () => {
  it("liefert 6-stelligen numerischen Code", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^\d{6}$/);
  });
});

// ============================================================
// Mock Supabase-Helper
// ============================================================
type FromImpl = (table: string) => unknown;

function mockSupabase(from: FromImpl) {
  return {
    from: vi.fn(from),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// ============================================================
// createHousingInvitation
// ============================================================
describe("createHousingInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("legt Einladung an, gibt Token + Code + expiresAt zurueck", async () => {
    const captured: Record<string, unknown>[] = [];
    const select = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue({
      data: {
        invite_token: "tok-abc",
        invite_code: "123456",
        expires_at: "2026-05-20T00:00:00Z",
      },
      error: null,
    });

    const db = mockSupabase((table) => {
      if (table === "housing_invitations") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            captured.push(row);
            return { select, single };
          }),
          select,
          single,
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await createHousingInvitation(db, {
      householdId: "hh-1",
      invitedByUserId: "user-1",
      expectedOrgName: "Hausverwaltung Mueller GmbH",
      expectedEmail: "info@mueller-hv.de",
      channel: "mailto",
    });

    expect(result.token).toBe("tok-abc");
    expect(result.code).toBe("123456");
    expect(result.expiresAt).toBe("2026-05-20T00:00:00Z");
    expect(captured[0]).toMatchObject({
      invited_household_id: "hh-1",
      invited_by_user_id: "user-1",
      expected_org_name: "Hausverwaltung Mueller GmbH",
      expected_email: "info@mueller-hv.de",
      channel: "mailto",
    });
    expect(captured[0].invite_token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(captured[0].invite_code).toMatch(/^\d{6}$/);
  });

  it("akzeptiert fehlende email fuer share/pdf-Kanal", async () => {
    const captured: Record<string, unknown>[] = [];
    const db = mockSupabase(() => ({
      insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
        captured.push(row);
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { invite_token: "t", invite_code: "000000", expires_at: "x" },
            error: null,
          }),
        };
      }),
    }));

    await createHousingInvitation(db, {
      householdId: "hh-1",
      invitedByUserId: "user-1",
      expectedOrgName: "HV X",
      channel: "pdf",
    });

    expect(captured[0].expected_email).toBeNull();
    expect(captured[0].channel).toBe("pdf");
  });

  it("wirft Fehler wenn INSERT scheitert", async () => {
    const db = mockSupabase(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "constraint violation" },
        }),
      }),
    }));

    await expect(
      createHousingInvitation(db, {
        householdId: "hh-1",
        invitedByUserId: "user-1",
        expectedOrgName: "HV",
        channel: "share",
      }),
    ).rejects.toThrow(/constraint violation/);
  });

  it("validiert channel-Wert", async () => {
    const db = mockSupabase(() => ({ insert: vi.fn() }));
    await expect(
      createHousingInvitation(db, {
        householdId: "hh-1",
        invitedByUserId: "user-1",
        expectedOrgName: "HV",
        // @ts-expect-error absichtlich falsch
        channel: "invalid",
      }),
    ).rejects.toThrow(/channel/i);
  });

  it("validiert expectedOrgName (nicht leer)", async () => {
    const db = mockSupabase(() => ({ insert: vi.fn() }));
    await expect(
      createHousingInvitation(db, {
        householdId: "hh-1",
        invitedByUserId: "user-1",
        expectedOrgName: "   ",
        channel: "mailto",
      }),
    ).rejects.toThrow(/name/i);
  });
});

// ============================================================
// consumeHousingInvitation
// ============================================================
describe("consumeHousingInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildConsumeMock(opts: {
    invitation?: Record<string, unknown> | null;
    invitationError?: { message: string } | null;
    insertedOrgId?: string;
    inserts?: Record<string, Record<string, unknown>[]>;
  }) {
    const inserts: Record<string, Record<string, unknown>[]> =
      opts.inserts ?? {};

    return mockSupabase((table: string) => {
      if (table === "housing_invitations") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: opts.invitation ?? null,
            error: opts.invitationError ?? null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === "civic_organizations") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            inserts.civic_organizations ??= [];
            inserts.civic_organizations.push(row);
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: opts.insertedOrgId ?? "civic-org-1" },
                error: null,
              }),
            };
          }),
        };
      }
      if (table === "civic_members") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            inserts.civic_members ??= [];
            inserts.civic_members.push(row);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      if (table === "housing_resident_links") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            inserts.housing_resident_links ??= [];
            inserts.housing_resident_links.push(row);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  }

  it("loest gueltigen Token ein, legt civic_org + member + resident_link an", async () => {
    const inserts: Record<string, Record<string, unknown>[]> = {};
    const db = buildConsumeMock({
      invitation: {
        id: "inv-1",
        invite_token: "tok-abc",
        invite_code: "123456",
        invited_by_user_id: "resident-user",
        invited_household_id: "hh-1",
        expected_org_name: "Hausverwaltung Mueller GmbH",
        channel: "mailto",
      },
      insertedOrgId: "civic-org-new",
      inserts,
    });

    const result = await consumeHousingInvitation(db, "tok-abc", "hv-user-1");

    expect(result.civicOrgId).toBe("civic-org-new");
    expect(result.householdId).toBe("hh-1");
    expect(inserts.civic_organizations?.[0]).toMatchObject({
      name: "Hausverwaltung Mueller GmbH",
      type: "housing",
    });
    expect(inserts.civic_members?.[0]).toMatchObject({
      org_id: "civic-org-new",
      user_id: "hv-user-1",
      role: "civic_admin",
    });
    expect(inserts.housing_resident_links?.[0]).toMatchObject({
      civic_org_id: "civic-org-new",
      household_id: "hh-1",
      user_id: "resident-user",
      linked_by: "hv-user-1",
    });
  });

  it("wirft Fehler bei unbekanntem Token/Code", async () => {
    const db = buildConsumeMock({ invitation: null });
    await expect(
      consumeHousingInvitation(db, "nicht-existierend", "hv-user-1"),
    ).rejects.toThrow(/not[-_ ]?found|nicht gefunden|abgelaufen/i);
  });

  it("wirft Fehler bei leerem tokenOrCode", async () => {
    const db = buildConsumeMock({ invitation: null });
    await expect(consumeHousingInvitation(db, "", "hv-user-1")).rejects.toThrow(
      /token|code/i,
    );
  });

  it("wirft Fehler wenn hvUserId leer ist", async () => {
    const db = buildConsumeMock({ invitation: null });
    await expect(consumeHousingInvitation(db, "tok-abc", "")).rejects.toThrow(
      /user/i,
    );
  });
});

// ============================================================
// Export-Sanity
// ============================================================
describe("module exports", () => {
  it("INVITATION_EXPIRY_DAYS ist 30", () => {
    expect(INVITATION_EXPIRY_DAYS).toBe(30);
  });
});
