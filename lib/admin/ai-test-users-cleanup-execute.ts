import { createHash } from "node:crypto";

import {
  AI_TEST_USER_REFERENCE_TABLES,
  buildAiTestUsersCleanupDryRunReport,
  type DryRunDb,
} from "@/lib/admin/ai-test-users-cleanup-dry-run";

type JsonRecord = Record<string, unknown>;

type DeleteResult = {
  error?: { message?: string } | null;
  count?: number | null;
};

type ExecuteQueryBuilder = {
  delete: (options?: { count?: "exact" }) => ExecuteQueryBuilder;
  in: (column: string, values: readonly string[]) => Promise<DeleteResult>;
  insert?: (payload: JsonRecord) => Promise<DeleteResult>;
};

export type ExecuteDb = {
  from: (table: string) => ExecuteQueryBuilder & ReturnType<DryRunDb["from"]>;
};

export type ExecuteAuthAdmin = {
  deleteUser: (userId: string) => Promise<{ error?: { message?: string } | null }>;
};

export type AiTestUsersCleanupExecuteReport = {
  mode: "execute";
  generatedAt: string;
  deletedUsers: number;
  deletedUserRefs: string[];
  deletedReferences: Array<{
    table: string;
    column: string;
    rows: number;
  }>;
};

export function assertAiTestCleanupExecuteMode(env: NodeJS.ProcessEnv | JsonRecord) {
  if (env.AI_TEST_CLEANUP_MODE !== "execute") {
    throw new Error("AI_TEST_CLEANUP_MODE muss exakt execute sein");
  }
}

export async function executeAiTestUsersCleanup(
  db: ExecuteDb,
  authAdmin: ExecuteAuthAdmin,
  options: {
    confirmation: string;
    now?: Date;
  },
): Promise<AiTestUsersCleanupExecuteReport> {
  const now = options.now ?? new Date();
  const dryRun = await buildAiTestUsersCleanupDryRunReport(
    db as unknown as DryRunDb,
    now,
  );

  if (dryRun.unsafeNameOnlyMatches.length > 0) {
    throw new Error(
      `Execute abgebrochen: ${dryRun.unsafeNameOnlyMatches.length} unsichere AI-Test-Namens-Treffer ohne is_test_user Flag`,
    );
  }

  const missingPilotDeleteMarker = dryRun.aiTestUsers.filter(
    (user) => user.mustDeleteBeforePilot !== true,
  );
  if (missingPilotDeleteMarker.length > 0) {
    throw new Error(
      `Execute abgebrochen: ${missingPilotDeleteMarker.length} AI-Testnutzer ohne must_delete_before_pilot Marker`,
    );
  }

  const userIds = dryRun.aiTestUsers.map((user) => user.id);
  assertManualConfirmation(options.confirmation, userIds.length);

  const deletedReferences = [];

  if (userIds.length > 0) {
    for (const [table, column] of AI_TEST_USER_REFERENCE_TABLES) {
      const result = await db
        .from(table)
        .delete({ count: "exact" })
        .in(column, userIds);
      if (result?.error) {
        throw new Error(
          `Execute abgebrochen: Delete aus ${table}.${column} fehlgeschlagen: ${result.error.message ?? "unbekannt"}`,
        );
      }
      deletedReferences.push({
        table,
        column,
        rows: result?.count ?? 0,
      });
    }

    const usersDelete = await db
      .from("users")
      .delete({ count: "exact" })
      .in("id", userIds);
    if (usersDelete?.error) {
      throw new Error(
        `Execute abgebrochen: Delete aus users.id fehlgeschlagen: ${usersDelete.error.message ?? "unbekannt"}`,
      );
    }
    deletedReferences.push({
      table: "users",
      column: "id",
      rows: usersDelete?.count ?? 0,
    });

    for (const userId of userIds) {
      const result = await authAdmin.deleteUser(userId);
      if (result?.error) {
        throw new Error(
          `Execute abgebrochen: Auth-User konnte nicht geloescht werden: ${result.error.message ?? "unbekannt"}`,
        );
      }
    }
  }

  return {
    mode: "execute",
    generatedAt: now.toISOString(),
    deletedUsers: userIds.length,
    deletedUserRefs: userIds.map(toPseudonymousUserRef),
    deletedReferences,
  };
}

function assertManualConfirmation(confirmation: string, userCount: number) {
  const expected = `AI-TESTNUTZER LOESCHEN:${userCount}`;
  if (confirmation !== expected) {
    throw new Error(`Bestaetigung muss exakt ${expected} lauten`);
  }
}

function toPseudonymousUserRef(userId: string): string {
  const hash = createHash("sha256").update(userId).digest("hex").slice(0, 12);
  return `ai-test-user:${hash}`;
}
