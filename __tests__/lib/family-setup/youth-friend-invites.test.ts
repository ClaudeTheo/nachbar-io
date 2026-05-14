import { describe, expect, it } from "vitest";

interface DbCall {
  table: string;
  inserts: unknown[];
  updates: unknown[];
}

function createMockDb(responses: Array<{ data: unknown; error?: unknown }>) {
  const calls: DbCall[] = [];
  let index = 0;
  const db = {
    from: (table: string) => {
      const call: DbCall = { table, inserts: [], updates: [] };
      calls.push(call);
      const response = responses[index++] ?? { data: null, error: null };
      const terminal = Promise.resolve({
        data: response.data,
        error: response.error ?? null,
      });
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.insert = (payload: unknown) => {
        call.inserts.push(payload);
        return chain;
      };
      chain.update = (payload: unknown) => {
        call.updates.push(payload);
        return chain;
      };
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.single = () => terminal;
      chain.maybeSingle = () => terminal;
      chain.then = terminal.then.bind(terminal);
      return chain;
    },
    calls,
  };
  return db;
}

describe("youth friend invite service", () => {
  it("creates only a pending request from a child and returns no setup token", async () => {
    const { createYouthFriendInviteRequest } = await import(
      "@/lib/family-setup/youth-friend-invites.service"
    );
    const db = createMockDb([
      {
        data: {
          guardian_user_id: "guardian-1",
          household_id: "house-1",
          quarter_id: "quarter-1",
        },
      },
      { data: { id: "request-1" } },
    ]);

    const result = await createYouthFriendInviteRequest(db as never, {
      childUserId: "child-1",
      friendDisplayName: "Leo",
      now: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(result).toEqual({
      requestId: "request-1",
      status: "pending_parent_approval",
    });
    const insert = db.calls.find((call) => call.table === "family_setup_invitations")
      ?.inserts[0] as Record<string, unknown>;
    expect(insert).toMatchObject({
      flow_type: "child_friend",
      status: "pending_parent_approval",
      created_by: "child-1",
      guardian_user_id: "guardian-1",
      target_ui_mode: "youth",
    });
    expect(result).not.toHaveProperty("token");
  });

  it("requires the parent link before approval creates a usable code", async () => {
    const { approveYouthFriendInviteRequest } = await import(
      "@/lib/family-setup/youth-friend-invites.service"
    );
    const db = createMockDb([
      {
        data: {
          id: "request-1",
          created_by: "child-1",
          guardian_user_id: "guardian-1",
          status: "pending_parent_approval",
          household_id: "house-1",
          quarter_id: "quarter-1",
          metadata: { friend_display_name: "Leo" },
        },
      },
      { data: { id: "link-1" } },
      { data: { id: "request-1", expires_at: "2026-05-14T22:00:00.000Z" } },
      { data: { id: "audit-1" } },
    ]);

    const result = await approveYouthFriendInviteRequest(db as never, {
      guardianUserId: "guardian-1",
      requestId: "request-1",
      appUrl: "https://nachbar.test",
      now: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(result.status).toBe("ready");
    expect(result.setupUrl).toMatch(/^https:\/\/nachbar\.test\/setup\/[A-Za-z0-9_-]+$/);
    expect(result.shortCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const update = db.calls.find(
      (call) => call.table === "family_setup_invitations" && call.updates.length > 0,
    )
      ?.updates[0] as Record<string, unknown>;
    expect(update).toMatchObject({ status: "ready" });
    expect(update.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
