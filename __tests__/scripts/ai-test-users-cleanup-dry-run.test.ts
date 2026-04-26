import { describe, expect, it, vi } from "vitest";

import {
  assertAiTestCleanupDryRunMode,
  buildAiTestUsersCleanupDryRunReport,
} from "@/lib/admin/ai-test-users-cleanup-dry-run";

type MockQueryResult = {
  data?: Record<string, unknown>[] | null;
  error?: { message?: string } | null;
  count?: number | null;
};

function createQuery(result: MockQueryResult) {
  const query = {
    select: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve(result)),
    in: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

describe("AI-Testnutzer Cleanup-Dry-Run", () => {
  it("bricht ab, wenn der Modus nicht exakt dry-run ist", () => {
    expect(() => assertAiTestCleanupDryRunMode({})).toThrow(
      "AI_TEST_CLEANUP_MODE muss exakt dry-run sein",
    );

    expect(() =>
      assertAiTestCleanupDryRunMode({ AI_TEST_CLEANUP_MODE: "dry-run" }),
    ).not.toThrow();
  });

  it("berichtet markierte AI-Testnutzer und trennt unsichere Namens-Treffer", async () => {
    const usersQuery = createQuery({
      data: [
        {
          id: "user-ai",
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
          id: "user-name-only",
          display_name: "AI-Test Ohne Flag",
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-26T10:05:00.000Z",
        },
      ],
      error: null,
    });
    const emptyQuery = createQuery({ data: [], error: null, count: 0 });
    const db = {
      from: vi.fn((table: string) => {
        if (table === "users") return usersQuery;
        return emptyQuery;
      }),
    };

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.mode).toBe("dry-run");
    expect(report.aiTestUsers).toHaveLength(1);
    expect(report.aiTestUsers[0]).toMatchObject({
      id: "user-ai",
      displayName: "AI-Test Erika",
      isTestUser: true,
      testUserKind: "ai_pilot",
      mustDeleteBeforePilot: true,
    });
    expect(report.unsafeNameOnlyMatches).toEqual([
      {
        id: "user-name-only",
        displayName: "AI-Test Ohne Flag",
        reason: "display_name beginnt mit AI-Test, aber settings.is_test_user ist nicht true",
      },
    ]);
    expect(db.from).toHaveBeenCalledWith("users");
  });
});
