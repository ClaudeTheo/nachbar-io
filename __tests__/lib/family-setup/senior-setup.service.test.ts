import { describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/services/service-error";

interface DbCall {
  table: string;
  inserts: unknown[];
  updates: unknown[];
  upserts: unknown[];
}

function createMockDb(responses: Array<{ data: unknown; error?: unknown }>) {
  const calls: DbCall[] = [];
  let index = 0;
  const db = {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "senior-user-1" } },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn((table: string) => {
      const call: DbCall = { table, inserts: [], updates: [], upserts: [] };
      calls.push(call);
      const response = responses[index++] ?? { data: null, error: null };
      const terminal = Promise.resolve({
        data: response.data,
        error: response.error ?? null,
      });
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn((payload: unknown) => {
        call.inserts.push(payload);
        return chain;
      });
      chain.update = vi.fn((payload: unknown) => {
        call.updates.push(payload);
        return chain;
      });
      chain.upsert = vi.fn((payload: unknown) => {
        call.upserts.push(payload);
        return chain;
      });
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.gt = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockReturnValue(terminal);
      chain.maybeSingle = vi.fn().mockReturnValue(terminal);
      chain.then = terminal.then.bind(terminal);
      return chain;
    }),
    calls,
  };
  return db;
}

describe("senior setup service", () => {
  it("creates a senior setup invitation with QR-safe payload", async () => {
    const { createSeniorSetupInvitation } = await import(
      "@/lib/family-setup/senior-setup.service"
    );
    const db = createMockDb([
      {
        data: {
          household_id: "house-1",
          households: { quarter_id: "quarter-1" },
        },
      },
      { data: { id: "setup-1", expires_at: "2026-05-15T10:00:00.000Z" } },
    ]);

    const result = await createSeniorSetupInvitation(db as never, {
      caregiverUserId: "relative-1",
      seniorDisplayName: "Erika",
      relationshipType: "child",
      targetUiMode: "senior",
      appUrl: "https://nachbar.test",
      now: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(result.status).toBe("ready");
    expect(result.setupUrl).toMatch(/^https:\/\/nachbar\.test\/setup\/[A-Za-z0-9_-]+$/);
    expect(result.setupUrl).not.toContain("Erika");
    expect(result.setupUrl).not.toContain("house-1");
    expect(result.shortCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    const insert = db.calls.find((call) => call.table === "family_setup_invitations")
      ?.inserts[0] as Record<string, unknown>;
    expect(insert).toMatchObject({
      flow_type: "senior_setup",
      created_by: "relative-1",
      household_id: "house-1",
      quarter_id: "quarter-1",
      target_ui_mode: "senior",
      relationship_type: "child",
    });
  });

  it("claims a senior setup invitation and creates a guarded caregiver link", async () => {
    const { claimSeniorSetupInvitation } = await import(
      "@/lib/family-setup/senior-setup.service"
    );
    const db = createMockDb([
      {
        data: {
          id: "setup-1",
          status: "ready",
          used_at: null,
          expires_at: "2026-05-14T10:10:00.000Z",
          created_by: "relative-1",
          household_id: "house-1",
          quarter_id: "quarter-1",
          target_ui_mode: "senior",
          relationship_type: "child",
          metadata: { senior_display_name: "Erika" },
        },
      },
      { data: { id: "setup-1" } },
      { data: { id: "senior-user-1" } },
      { data: { id: "member-1" } },
      { data: { id: "caregiver-link-1" } },
      { data: { id: "setup-1" } },
    ]);

    const result = await claimSeniorSetupInvitation(db as never, {
      token: "raw-token",
      email: "erika@example.test",
      password: "SicheresPasswort123!",
      displayName: "Erika",
      now: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(result.userId).toBe("senior-user-1");
    expect(result.redirectTo).toBe("/kreis-start");
    expect(
      db.calls.find((call) => call.table === "users")?.upserts[0],
    ).toMatchObject({ id: "senior-user-1", ui_mode: "senior" });
    expect(
      db.calls.find((call) => call.table === "caregiver_links")?.inserts[0],
    ).toMatchObject({
      resident_id: "senior-user-1",
      caregiver_id: "relative-1",
      relationship_type: "child",
      setup_origin: "family_qr",
      consent_status: "pending_senior_confirm",
      profile_edit_allowed: true,
      sensitive_data_allowed: false,
    });
  });

  it("returns a clear conflict for duplicate caregiver links", async () => {
    const { claimSeniorSetupInvitation } = await import(
      "@/lib/family-setup/senior-setup.service"
    );
    const db = createMockDb([
      {
        data: {
          id: "setup-1",
          status: "ready",
          used_at: null,
          expires_at: "2026-05-14T10:10:00.000Z",
          created_by: "relative-1",
          household_id: null,
          quarter_id: null,
          target_ui_mode: "senior",
          relationship_type: "child",
          metadata: { senior_display_name: "Erika" },
        },
      },
      { data: { id: "setup-1" } },
      { data: { id: "senior-user-1" } },
      {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      },
      { data: { id: "setup-1" } },
    ]);

    await expect(
      claimSeniorSetupInvitation(db as never, {
        token: "raw-token",
        email: "erika@example.test",
        password: "SicheresPasswort123!",
        displayName: "Erika",
        now: new Date("2026-05-14T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject<ServiceError>({
      status: 409,
      code: "CAREGIVER_LINK_EXISTS",
    });
  });
});
