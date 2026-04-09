// Tests fuer den Consent-Service (Phase 1 / G2)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { grantConsent, revokeConsent, listConsents } from "../consent.service";
import { ServiceError } from "../service-error";

// Mock Supabase Client
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

const SUBJECT_ID = "user-bewohner-1";
const GRANTEE_ID = "user-angehoerige-1";
const ORG_ID = "org-pflegedienst-1";

describe("grantConsent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("erstellt Consent mit gueltigem Purpose und grantee_id", async () => {
    const mockConsent = {
      id: "consent-1",
      subject_id: SUBJECT_ID,
      grantee_id: GRANTEE_ID,
      grantee_org_id: null,
      purpose: "heartbeat_view",
      granted_at: "2026-04-08T10:00:00Z",
      revoked_at: null,
    };

    const supabase = createMockSupabase({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockConsent, error: null }),
    });

    const result = await grantConsent(supabase as never, SUBJECT_ID, {
      grantee_id: GRANTEE_ID,
      purpose: "heartbeat_view",
    });

    expect(result).toEqual(mockConsent);
    expect(supabase.from).toHaveBeenCalledWith("consent_grants");
  });

  it("lehnt ungueltigen Purpose ab", async () => {
    const supabase = createMockSupabase();

    await expect(
      grantConsent(supabase as never, SUBJECT_ID, {
        grantee_id: GRANTEE_ID,
        purpose: "invalid_purpose",
      }),
    ).rejects.toThrow(ServiceError);

    await expect(
      grantConsent(supabase as never, SUBJECT_ID, {
        grantee_id: GRANTEE_ID,
        purpose: "invalid_purpose",
      }),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_PURPOSE" });
  });

  it("lehnt fehlenden Grantee ab", async () => {
    const supabase = createMockSupabase();

    await expect(
      grantConsent(supabase as never, SUBJECT_ID, {
        purpose: "heartbeat_view",
      }),
    ).rejects.toMatchObject({ status: 400, code: "MISSING_GRANTEE" });
  });

  it("verhindert doppelten Consent", async () => {
    const supabase = createMockSupabase({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "existing" }, error: null }),
    });

    await expect(
      grantConsent(supabase as never, SUBJECT_ID, {
        grantee_id: GRANTEE_ID,
        purpose: "heartbeat_view",
      }),
    ).rejects.toMatchObject({ status: 409, code: "CONSENT_EXISTS" });
  });

  it("akzeptiert grantee_org_id statt grantee_id", async () => {
    const mockConsent = {
      id: "consent-2",
      subject_id: SUBJECT_ID,
      grantee_id: null,
      grantee_org_id: ORG_ID,
      purpose: "care_coordinate",
      granted_at: "2026-04-08T10:00:00Z",
      revoked_at: null,
    };

    const supabase = createMockSupabase({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockConsent, error: null }),
    });

    const result = await grantConsent(supabase as never, SUBJECT_ID, {
      grantee_org_id: ORG_ID,
      purpose: "care_coordinate",
    });

    expect(result.grantee_org_id).toBe(ORG_ID);
    expect(result.grantee_id).toBeNull();
  });
});

describe("revokeConsent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("widerruft aktiven Consent", async () => {
    const activeConsent = {
      id: "consent-1",
      subject_id: SUBJECT_ID,
      grantee_id: GRANTEE_ID,
      purpose: "heartbeat_view",
      revoked_at: null,
    };
    const revokedConsent = {
      ...activeConsent,
      revoked_at: "2026-04-08T12:00:00Z",
    };

    const supabase = createMockSupabase({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: activeConsent, error: null }),
      single: vi.fn().mockResolvedValue({ data: revokedConsent, error: null }),
    });

    const result = await revokeConsent(
      supabase as never,
      SUBJECT_ID,
      "consent-1",
    );
    expect(result.consent.revoked_at).toBeTruthy();
    expect(result.deletion_receipt).toBeDefined();
    expect(result.deletion_receipt.consent_id).toBe("consent-1");
    expect(result.deletion_receipt.purpose).toBe("heartbeat_view");
  });

  it("gibt 404 bei unbekanntem Consent", async () => {
    const supabase = createMockSupabase({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(
      revokeConsent(supabase as never, SUBJECT_ID, "nonexistent"),
    ).rejects.toMatchObject({ status: 404, code: "CONSENT_NOT_FOUND" });
  });

  it("gibt 409 bei bereits widerrufener Einwilligung", async () => {
    const alreadyRevoked = {
      id: "consent-1",
      subject_id: SUBJECT_ID,
      revoked_at: "2026-04-01T10:00:00Z",
    };

    const supabase = createMockSupabase({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: alreadyRevoked, error: null }),
    });

    await expect(
      revokeConsent(supabase as never, SUBJECT_ID, "consent-1"),
    ).rejects.toMatchObject({ status: 409, code: "CONSENT_ALREADY_REVOKED" });
  });
});

describe("listConsents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listet nur aktive Consents per Default", async () => {
    const consents = [
      { id: "c1", purpose: "heartbeat_view", revoked_at: null },
      { id: "c2", purpose: "checkin_view", revoked_at: null },
    ];

    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: consents, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) };

    const result = await listConsents(supabase as never, SUBJECT_ID);
    expect(result).toHaveLength(2);
    expect(chain.is).toHaveBeenCalledWith("revoked_at", null);
  });

  it("listet auch widerrufene wenn include_revoked=true", async () => {
    const consents = [
      { id: "c1", revoked_at: null },
      { id: "c2", revoked_at: "2026-04-01T10:00:00Z" },
    ];

    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: consents, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) };

    const result = await listConsents(supabase as never, SUBJECT_ID, true);
    expect(result).toHaveLength(2);
  });

  it("gibt leeres Array bei keinen Consents", async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) };

    const result = await listConsents(supabase as never, SUBJECT_ID);
    expect(result).toEqual([]);
  });
});
