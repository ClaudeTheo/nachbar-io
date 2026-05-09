import { describe, expect, it, vi } from "vitest";

import {
  assertAiTestCleanupDryRunMode,
  buildAiTestUsersCleanupDryRunReport,
  FOUNDER_ALLOWLIST_EMAILS,
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

function createDb(result: MockQueryResult) {
  const usersQuery = createQuery(result);
  const emptyQuery = createQuery({ data: [], error: null, count: 0 });
  return {
    from: vi.fn((table: string) => {
      if (table === "users") return usersQuery;
      return emptyQuery;
    }),
  };
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
    const db = createDb({
      data: [
        {
          id: "user-ai",
          display_name: "AI-Test Erika",
          email: "ai-test-erika@example.com",
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
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-26T10:05:00.000Z",
        },
      ],
      error: null,
    });

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

  it("erkennt E2E Testnutzer ohne Flag als unmarkierter Synthetik-Kandidat", async () => {
    const db = createDb({
      data: [
        {
          id: "user-e2e-1",
          display_name: "E2E Testnutzer",
          email: "e2e-1@example.com",
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.aiTestUsers).toHaveLength(0);
    expect(report.unmarkedSyntheticCandidates).toHaveLength(1);
    expect(report.unmarkedSyntheticCandidates[0]).toMatchObject({
      id: "user-e2e-1",
      displayName: "E2E Testnutzer",
      reason: expect.stringContaining("E2E Testnutzer"),
    });
  });

  it("erkennt KI-Synthetik-Namen (Vorname X.) als unmarkierter Synthetik-Kandidat", async () => {
    const db = createDb({
      data: [
        {
          id: "user-petra",
          display_name: "Petra K.",
          email: "petra@example.com",
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:00:00.000Z",
        },
        {
          id: "user-xaver",
          display_name: "Xaver U.",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:05:00.000Z",
        },
        {
          id: "user-gertrude",
          display_name: "Gertrude H.",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:10:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.unmarkedSyntheticCandidates.map((c) => c.id).sort()).toEqual([
      "user-gertrude",
      "user-petra",
      "user-xaver",
    ]);
    expect(
      report.unmarkedSyntheticCandidates.every((c) =>
        c.reason.includes("KI-Synthetik"),
      ),
    ).toBe(true);
  });

  it("erkennt ai-test-Praefix ohne Flag als unmarkierter Synthetik-Kandidat", async () => {
    const db = createDb({
      data: [
        {
          id: "user-onboarding",
          display_name: "ai-test-onboarding-20260427",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-27T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.unmarkedSyntheticCandidates).toHaveLength(1);
    expect(report.unmarkedSyntheticCandidates[0]).toMatchObject({
      id: "user-onboarding",
      reason: expect.stringContaining("ai-test"),
    });
  });

  it("Founder-Email landet in Allowlist-Skips, nicht in Kandidaten", async () => {
    expect(FOUNDER_ALLOWLIST_EMAILS).toContain("thomasth@gmx.de");
    const db = createDb({
      data: [
        {
          id: "user-founder",
          display_name: "Petra K.",
          email: "thomasth@gmx.de",
          trust_level: "verified",
          is_admin: true,
          settings: {},
          created_at: "2026-04-19T09:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.aiTestUsers).toHaveLength(0);
    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
    expect(report.allowlistSkips).toEqual([
      {
        id: "user-founder",
        displayName: "Petra K.",
        email: "thomasth@gmx.de",
        reason: "founder-email",
      },
    ]);
  });

  it("Allowlist-User-IDs landen in Allowlist-Skips, nicht in Kandidaten", async () => {
    const db = createDb({
      data: [
        {
          id: "6f3e06ce-aaaa-bbbb-cccc-dddddddddddd",
          display_name: "Klara S.",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:00:00.000Z",
        },
        {
          id: "53aaea93-1111-2222-3333-444444444444",
          display_name: "ai-test-codex",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:05:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db, {
      allowlistUserIds: [
        "6f3e06ce-aaaa-bbbb-cccc-dddddddddddd",
        "53aaea93-1111-2222-3333-444444444444",
      ],
    });

    expect(report.aiTestUsers).toHaveLength(0);
    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
    expect(report.allowlistSkips.map((s) => s.id).sort()).toEqual([
      "53aaea93-1111-2222-3333-444444444444",
      "6f3e06ce-aaaa-bbbb-cccc-dddddddddddd",
    ]);
    expect(report.allowlistSkips.every((s) => s.reason === "explicit-user-id")).toBe(
      true,
    );
  });

  it("Backwards-Compat: User mit is_test_user=true bleibt in aiTestUsers", async () => {
    const db = createDb({
      data: [
        {
          id: "user-marked",
          display_name: "AI-Test Karl",
          email: null,
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
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.aiTestUsers).toHaveLength(1);
    expect(report.aiTestUsers[0].id).toBe("user-marked");
    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
  });

  it("ignoriert echte User (kein Pattern, kein Flag, keine Allowlist)", async () => {
    const db = createDb({
      data: [
        {
          id: "user-real",
          display_name: "Maria Mustermann",
          email: "maria@example.com",
          trust_level: "verified",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.aiTestUsers).toHaveLength(0);
    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
    expect(report.allowlistSkips).toHaveLength(0);
    expect(report.unsafeNameOnlyMatches).toHaveLength(0);
  });

  it("Strict-Modus unterdrueckt unmarkierte Synthetik-Kandidaten", async () => {
    const db = createDb({
      data: [
        {
          id: "user-petra",
          display_name: "Petra K.",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:00:00.000Z",
        },
        {
          id: "user-marked",
          display_name: "AI-Test Karl",
          email: null,
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
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db, { strict: true });

    expect(report.aiTestUsers).toHaveLength(1);
    expect(report.aiTestUsers[0].id).toBe("user-marked");
    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
    expect(report.options.strict).toBe(true);
  });

  it("Before-Cutoff filtert nur User mit created_at < before", async () => {
    const db = createDb({
      data: [
        {
          id: "user-before",
          display_name: "Petra K.",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-10T09:00:00.000Z",
        },
        {
          id: "user-after",
          display_name: "Klara S.",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-05-20T09:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db, {
      before: "2026-05-01",
    });

    expect(report.unmarkedSyntheticCandidates).toHaveLength(1);
    expect(report.unmarkedSyntheticCandidates[0].id).toBe("user-before");
    expect(report.options.before).toBe("2026-05-01");
  });

  it("Allowlist hat Vorrang vor Pattern-Match (auch bei E2E Testnutzer)", async () => {
    const db = createDb({
      data: [
        {
          id: "allowlisted-id",
          display_name: "E2E Testnutzer",
          email: null,
          trust_level: "pending",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db, {
      allowlistUserIds: ["allowlisted-id"],
    });

    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
    expect(report.allowlistSkips).toHaveLength(1);
    expect(report.allowlistSkips[0].id).toBe("allowlisted-id");
  });

  it("Echter Nachname mit Punkt-Pattern aber ohne Synthetik-Form wird nicht erkannt", async () => {
    const db = createDb({
      data: [
        {
          id: "user-real-with-middle",
          display_name: "Hans-Peter A. Schmidt",
          email: "hans@example.com",
          trust_level: "verified",
          is_admin: false,
          settings: {},
          created_at: "2026-04-19T09:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildAiTestUsersCleanupDryRunReport(db);

    expect(report.unmarkedSyntheticCandidates).toHaveLength(0);
    expect(report.aiTestUsers).toHaveLength(0);
  });
});
