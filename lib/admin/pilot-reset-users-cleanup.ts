// Pilot-Reset-User-Cleanup
//
// Einmaliger Pre-Pilot-Reset: alle User aus public.users + auth.users loeschen,
// ausser den auf der Founder-Allowlist. Ergaenzt den AI-Test-Cleanup-Pfad
// (lib/admin/ai-test-users-cleanup-execute.ts), der nur is_test_user=true loescht.
//
// Diese Datei ist Audit-Trail fuer den parallelen MCP-SQL-Pfad. Beide muessen
// die gleiche Logik haben:
//   1) Allowlist case-insensitive auf Email vergleichen.
//   2) Kandidaten = alle anderen User.
//   3) Reihenfolge: Referenztabellen → public.users → auth.users.
//   4) Bestaetigung "PILOT-RESET-LOESCHEN:<count>" exakt verlangen.

export const PILOT_RESET_FOUNDER_ALLOWLIST = ["thomasth@gmx.de"] as const;

export interface PilotResetUserRow {
  id: string;
  email: string | null;
}

export interface PilotResetCandidateListOptions {
  additionalAllowlistEmails?: readonly string[];
}

export interface PilotResetAllowlistSkip {
  id: string;
  email: string | null;
  reason: "founder-email";
}

export interface PilotResetCandidateList {
  candidates: PilotResetUserRow[];
  allowlistSkips: PilotResetAllowlistSkip[];
}

export function buildPilotResetCandidateList(
  users: readonly PilotResetUserRow[],
  options: PilotResetCandidateListOptions = {},
): PilotResetCandidateList {
  const allowlist = new Set<string>(
    [
      ...PILOT_RESET_FOUNDER_ALLOWLIST,
      ...(options.additionalAllowlistEmails ?? []),
    ].map((e) => e.toLowerCase()),
  );

  const candidates: PilotResetUserRow[] = [];
  const allowlistSkips: PilotResetAllowlistSkip[] = [];

  for (const user of users) {
    if (!user || typeof user.id !== "string" || user.id.length === 0) continue;
    const emailLower = user.email?.toLowerCase() ?? null;
    if (emailLower && allowlist.has(emailLower)) {
      allowlistSkips.push({
        id: user.id,
        email: user.email,
        reason: "founder-email",
      });
      continue;
    }
    candidates.push(user);
  }

  return { candidates, allowlistSkips };
}

type DeleteResult = {
  error?: { message?: string } | null;
  count?: number | null;
};

type SelectResult = {
  data?: PilotResetUserRow[] | null;
  error?: { message?: string } | null;
};

type SelectBuilder = {
  order: (column: string) => Promise<SelectResult>;
};

type DeleteBuilder = {
  in: (column: string, ids: readonly string[]) => Promise<DeleteResult>;
};

type Builder = {
  select: (columns: string) => SelectBuilder;
  delete: () => DeleteBuilder;
};

export type PilotResetDb = {
  from: (table: string) => Builder;
};

export type PilotResetAuthAdmin = {
  deleteUser: (userId: string) => Promise<{ error?: { message?: string } | null }>;
};

export type PilotResetReferenceTable = readonly [table: string, column: string];

export interface ExecutePilotResetOptions {
  confirmation: string;
  referenceTables: readonly PilotResetReferenceTable[];
  additionalAllowlistEmails?: readonly string[];
  /** Wenn true: Lauf wirft, falls Founder-Email nicht in der DB-Liste vorkommt. */
  requireFounderPresent?: boolean;
  now?: Date;
}

export interface PilotResetReport {
  mode: "pilot-reset";
  generatedAt: string;
  deletedUsers: number;
  deletedReferences: Array<{ table: string; column: string; rows: number }>;
  allowlistSkips: PilotResetAllowlistSkip[];
}

export async function executePilotResetUsersCleanup(
  db: PilotResetDb,
  authAdmin: PilotResetAuthAdmin,
  options: ExecutePilotResetOptions,
): Promise<PilotResetReport> {
  const now = options.now ?? new Date();

  const listResult = await db
    .from("users")
    .select("id, email")
    .order("created_at");

  if (listResult.error) {
    throw new Error(
      `Pilot-Reset abgebrochen: User-Liste konnte nicht gelesen werden: ${listResult.error.message ?? "unbekannt"}`,
    );
  }

  const userRows: PilotResetUserRow[] = (listResult.data ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? null,
  }));

  const { candidates, allowlistSkips } = buildPilotResetCandidateList(userRows, {
    additionalAllowlistEmails: options.additionalAllowlistEmails,
  });

  if (options.requireFounderPresent) {
    const founderPresent = allowlistSkips.some(
      (skip) =>
        skip.email?.toLowerCase() ===
        PILOT_RESET_FOUNDER_ALLOWLIST[0].toLowerCase(),
    );
    if (!founderPresent) {
      throw new Error(
        "Pilot-Reset abgebrochen: Founder-Email nicht in DB-Liste gefunden — Sanity-Check fehlgeschlagen.",
      );
    }
  }

  assertConfirmation(options.confirmation, candidates.length);

  const userIds = candidates.map((c) => c.id);
  const deletedReferences: PilotResetReport["deletedReferences"] = [];

  if (userIds.length === 0) {
    return {
      mode: "pilot-reset",
      generatedAt: now.toISOString(),
      deletedUsers: 0,
      deletedReferences,
      allowlistSkips,
    };
  }

  for (const [table, column] of options.referenceTables) {
    const result = await db.from(table).delete().in(column, userIds);
    if (result.error) {
      throw new Error(
        `Pilot-Reset abgebrochen: Delete aus ${table}.${column} fehlgeschlagen: ${result.error.message ?? "unbekannt"}`,
      );
    }
    deletedReferences.push({ table, column, rows: result.count ?? 0 });
  }

  const usersDelete = await db.from("users").delete().in("id", userIds);
  if (usersDelete.error) {
    throw new Error(
      `Pilot-Reset abgebrochen: Delete aus users.id fehlgeschlagen: ${usersDelete.error.message ?? "unbekannt"}`,
    );
  }
  deletedReferences.push({
    table: "users",
    column: "id",
    rows: usersDelete.count ?? 0,
  });

  for (const userId of userIds) {
    const result = await authAdmin.deleteUser(userId);
    if (result.error) {
      throw new Error(
        `Pilot-Reset abgebrochen: Auth-User-Delete fuer ${userId} fehlgeschlagen: ${result.error.message ?? "unbekannt"}`,
      );
    }
  }

  return {
    mode: "pilot-reset",
    generatedAt: now.toISOString(),
    deletedUsers: userIds.length,
    deletedReferences,
    allowlistSkips,
  };
}

function assertConfirmation(confirmation: string, count: number) {
  const expected = `PILOT-RESET-LOESCHEN:${count}`;
  if (confirmation !== expected) {
    throw new Error(`Bestaetigung muss exakt ${expected} lauten`);
  }
}
