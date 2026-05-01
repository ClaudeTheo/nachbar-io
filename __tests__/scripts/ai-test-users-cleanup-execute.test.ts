import { describe, expect, it, vi } from "vitest";

import {
  assertAiTestCleanupExecuteMode,
  executeAiTestUsersCleanup,
} from "@/lib/admin/ai-test-users-cleanup-execute";

type MockQueryResult = {
  data?: Record<string, unknown>[] | null;
  error?: { message?: string } | null;
  count?: number | null;
};

type TableData = Record<string, MockQueryResult>;

function createDb(tableData: TableData) {
  const calls: Array<{
    table: string;
    operation: "select" | "delete" | "insert";
    column?: string;
    values?: readonly string[];
    payload?: unknown;
  }> = [];

  const db = {
    from: vi.fn((table: string) => {
      const result = tableData[table] ?? { data: [], error: null, count: 0 };
      const query = {
        select: vi.fn(() => {
          calls.push({ table, operation: "select" });
          return query;
        }),
        or: vi.fn(() => query),
        order: vi.fn(() => Promise.resolve(result)),
        delete: vi.fn(() => {
          calls.push({ table, operation: "delete" });
          return query;
        }),
        insert: vi.fn((payload: unknown) => {
          calls.push({ table, operation: "insert", payload });
          return Promise.resolve(result);
        }),
        in: vi.fn((column: string, values: readonly string[]) => {
          calls.push({ table, operation: "delete", column, values });
          return Promise.resolve(result);
        }),
      };
      return query;
    }),
    calls,
  };

  return db;
}

function createAuthAdmin() {
  return {
    deleteUser: vi.fn(() => Promise.resolve({ error: null })),
  };
}

describe("AI-Testnutzer Cleanup-Execute", () => {
  it("bricht ab, wenn der Modus nicht exakt execute ist", () => {
    expect(() => assertAiTestCleanupExecuteMode({})).toThrow(
      "AI_TEST_CLEANUP_MODE muss exakt execute sein",
    );

    expect(() =>
      assertAiTestCleanupExecuteMode({ AI_TEST_CLEANUP_MODE: "execute" }),
    ).not.toThrow();
  });

  it("fordert eine manuelle Bestaetigung mit erwarteter Nutzerzahl", async () => {
    const db = createDb({
      users: {
        data: [
          {
            id: "user-ai-1",
            display_name: "AI-Test Erika",
            trust_level: "verified",
            is_admin: false,
            settings: {
              is_test_user: true,
              test_user_kind: "ai_pilot",
              must_delete_before_pilot: true,
            },
            created_at: "2026-04-26T10:00:00.000Z",
          },
        ],
      },
    });

    await expect(
      executeAiTestUsersCleanup(db, createAuthAdmin(), {
        confirmation: "AI-TESTNUTZER LOESCHEN",
        now: new Date("2026-05-01T09:00:00.000Z"),
      }),
    ).rejects.toThrow(
      "Bestaetigung muss exakt AI-TESTNUTZER LOESCHEN:1 lauten",
    );
  });

  it("bricht bei unsicheren Namens-Treffern ab", async () => {
    const db = createDb({
      users: {
        data: [
          {
            id: "user-name-only",
            display_name: "AI-Test Ohne Flag",
            trust_level: "pending",
            is_admin: false,
            settings: {},
            created_at: "2026-04-26T10:00:00.000Z",
          },
        ],
      },
    });

    await expect(
      executeAiTestUsersCleanup(db, createAuthAdmin(), {
        confirmation: "AI-TESTNUTZER LOESCHEN:0",
        now: new Date("2026-05-01T09:00:00.000Z"),
      }),
    ).rejects.toThrow(
      "Execute abgebrochen: 1 unsichere AI-Test-Namens-Treffer ohne is_test_user Flag",
    );
  });

  it("bricht ab, wenn markierte Testnutzer nicht fuer Pilot-Cleanup freigegeben sind", async () => {
    const db = createDb({
      users: {
        data: [
          {
            id: "user-ai-1",
            display_name: "AI-Test Erika",
            trust_level: "verified",
            is_admin: false,
            settings: {
              is_test_user: true,
              test_user_kind: "ai_pilot",
              must_delete_before_pilot: false,
            },
            created_at: "2026-04-26T10:00:00.000Z",
          },
        ],
      },
    });

    await expect(
      executeAiTestUsersCleanup(db, createAuthAdmin(), {
        confirmation: "AI-TESTNUTZER LOESCHEN:1",
        now: new Date("2026-05-01T09:00:00.000Z"),
      }),
    ).rejects.toThrow(
      "Execute abgebrochen: 1 AI-Testnutzer ohne must_delete_before_pilot Marker",
    );
  });

  it("loescht nur hart markierte AI-Testnutzer und gibt nur pseudonymisierte IDs zurueck", async () => {
    const db = createDb({
      users: {
        data: [
          {
            id: "user-ai-1",
            display_name: "AI-Test Erika",
            trust_level: "verified",
            is_admin: false,
            settings: {
              is_test_user: true,
              test_user_kind: "ai_pilot",
              must_delete_before_pilot: true,
            },
            created_at: "2026-04-26T10:00:00.000Z",
          },
          {
            id: "user-ai-2",
            display_name: "AI-Test Karl",
            trust_level: "verified",
            is_admin: false,
            settings: {
              is_test_user: true,
              test_user_kind: "ai_pilot",
              must_delete_before_pilot: true,
            },
            created_at: "2026-04-26T10:05:00.000Z",
          },
        ],
      },
    });
    const authAdmin = createAuthAdmin();

    const report = await executeAiTestUsersCleanup(db, authAdmin, {
      confirmation: "AI-TESTNUTZER LOESCHEN:2",
      now: new Date("2026-05-01T09:00:00.000Z"),
    });

    expect(report).toMatchObject({
      mode: "execute",
      generatedAt: "2026-05-01T09:00:00.000Z",
      deletedUsers: 2,
    });
    expect(report.deletedUserRefs).toHaveLength(2);
    expect(report.deletedUserRefs[0]).toMatch(/^ai-test-user:[a-f0-9]{12}$/);
    expect(JSON.stringify(report)).not.toContain("user-ai-1");
    expect(JSON.stringify(report)).not.toContain("AI-Test Erika");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-ai-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-ai-2");
    expect(db.calls).toContainEqual({
      table: "users",
      operation: "delete",
      column: "id",
      values: ["user-ai-1", "user-ai-2"],
    });
  });
});
