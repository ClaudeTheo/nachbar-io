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
          data: { user: { id: "child-user-1" } },
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

describe("child setup service", () => {
  it("creates a child setup invitation for the first five active children", async () => {
    const { createChildSetupInvitation } = await import(
      "@/lib/family-setup/child-setup.service"
    );
    const db = createMockDb([
      { data: [{ id: "child-link-1" }, { id: "child-link-2" }] },
      {
        data: {
          household_id: "house-1",
          households: { quarter_id: "quarter-1" },
        },
      },
      { data: { id: "setup-1", expires_at: "2026-05-15T10:00:00.000Z" } },
    ]);

    const result = await createChildSetupInvitation(db as never, {
      guardianUserId: "guardian-1",
      childDisplayName: "Mia",
      childBirthYear: 2012,
      relationshipType: "parent",
      appUrl: "https://nachbar.test",
      now: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(result.status).toBe("ready");
    expect(result.setupUrl).toMatch(/^https:\/\/nachbar\.test\/setup\/[A-Za-z0-9_-]+$/);
    expect(result.setupUrl).not.toContain("Mia");
    expect(result.setupUrl).not.toContain("house-1");
    expect(result.shortCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    const insert = db.calls.find((call) => call.table === "family_setup_invitations")
      ?.inserts[0] as Record<string, unknown>;
    expect(insert).toMatchObject({
      flow_type: "child_direct",
      status: "ready",
      created_by: "guardian-1",
      guardian_user_id: "guardian-1",
      household_id: "house-1",
      quarter_id: "quarter-1",
      target_ui_mode: "youth",
      relationship_type: "parent",
    });
    expect(insert.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(insert.short_code_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires admin review for the sixth child and returns no usable token", async () => {
    const { createChildSetupInvitation } = await import(
      "@/lib/family-setup/child-setup.service"
    );
    const db = createMockDb([
      { data: Array.from({ length: 5 }, (_, i) => ({ id: `child-${i}` })) },
      {
        data: {
          household_id: "house-1",
          households: { quarter_id: "quarter-1" },
        },
      },
      { data: { id: "review-1", expires_at: "2026-05-15T10:00:00.000Z" } },
    ]);

    await expect(
      createChildSetupInvitation(db as never, {
        guardianUserId: "guardian-1",
        childDisplayName: "Noah",
        childBirthYear: 2014,
        relationshipType: "parent",
        appUrl: "https://nachbar.test",
        now: new Date("2026-05-14T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject<ServiceError>({
      status: 409,
      code: "CHILD_LIMIT_REVIEW_REQUIRED",
      data: { status: "needs_admin_review" },
    });

    const reviewInsert = db.calls.find(
      (call) => call.table === "family_setup_invitations",
    )?.inserts[0] as Record<string, unknown>;
    expect(reviewInsert.status).toBe("needs_admin_review");
  });

  it("does not create a child link when account creation fails during claim", async () => {
    const { claimChildSetupInvitation } = await import(
      "@/lib/family-setup/child-setup.service"
    );
    const db = createMockDb([
      {
        data: {
          id: "setup-1",
          status: "ready",
          used_at: null,
          expires_at: "2026-05-14T10:10:00.000Z",
          guardian_user_id: "guardian-1",
          household_id: "house-1",
          quarter_id: "quarter-1",
          relationship_type: "parent",
          metadata: { child_birth_year: 2012, child_display_name: "Mia" },
        },
      },
      { data: { id: "setup-1" } },
      { data: { id: "setup-1" } },
    ]);
    db.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "email already exists" },
    });

    await expect(
      claimChildSetupInvitation(db as never, {
        token: "raw-token",
        email: "mia@example.test",
        password: "SicheresPasswort123!",
        displayName: "Mia",
        now: new Date("2026-05-14T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject<ServiceError>({ status: 409 });

    expect(db.calls.some((call) => call.table === "family_child_links")).toBe(false);
  });

  it("creates youth profile and guardian link when a setup token is claimed", async () => {
    const { claimChildSetupInvitation } = await import(
      "@/lib/family-setup/child-setup.service"
    );
    const db = createMockDb([
      {
        data: {
          id: "setup-1",
          status: "ready",
          used_at: null,
          expires_at: "2026-05-14T10:10:00.000Z",
          guardian_user_id: "guardian-1",
          household_id: "house-1",
          quarter_id: "quarter-1",
          relationship_type: "parent",
          metadata: { child_birth_year: 2012, child_display_name: "Mia" },
        },
      },
      { data: { id: "setup-1" } },
      { data: { id: "child-user-1" } },
      { data: { id: "profile-1" } },
      { data: { id: "link-1" } },
      { data: { id: "member-1" } },
      { data: { id: "setup-1" } },
    ]);

    const result = await claimChildSetupInvitation(db as never, {
      token: "raw-token",
      email: "mia@example.test",
      password: "SicheresPasswort123!",
      displayName: "Mia",
      now: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(result.userId).toBe("child-user-1");
    expect(result.redirectTo).toBe("/jugend");
    expect(db.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "mia@example.test",
        password: "SicheresPasswort123!",
        email_confirm: true,
        user_metadata: expect.objectContaining({ ui_mode: "youth" }),
      }),
    );
    expect(
      db.calls.find((call) => call.table === "users")?.upserts[0],
    ).toMatchObject({ id: "child-user-1", ui_mode: "youth" });
    expect(
      db.calls.find((call) => call.table === "family_child_links")?.inserts[0],
    ).toMatchObject({
      guardian_user_id: "guardian-1",
      child_user_id: "child-user-1",
      relationship_type: "parent",
      status: "active",
    });
  });
});
