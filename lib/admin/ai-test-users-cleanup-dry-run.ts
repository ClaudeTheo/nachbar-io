type JsonRecord = Record<string, unknown>;

type QueryResult<T = unknown> = {
  data?: T[] | null;
  error?: { message?: string } | null;
  count?: number | null;
};

type QuerySelectOptions = {
  count?: "exact";
  head?: boolean;
};

type QueryOrderOptions = {
  ascending?: boolean;
};

type QueryBuilder<T = JsonRecord> = {
  select: (columns: string, options?: QuerySelectOptions) => QueryBuilder<T>;
  or: (filters: string) => QueryBuilder<T>;
  order: (column: string, options?: QueryOrderOptions) => Promise<QueryResult<T>>;
  in: (column: string, values: readonly string[]) => Promise<QueryResult<T>>;
};

export type DryRunDb = {
  from: (table: string) => QueryBuilder;
};

type RawUser = {
  id: string;
  display_name: string | null;
  trust_level: string | null;
  is_admin: boolean | null;
  settings: JsonRecord | null;
  created_at: string | null;
};

export type AiTestUserCleanupDryRunReport = {
  mode: "dry-run";
  generatedAt: string;
  aiTestUsers: Array<{
    id: string;
    displayName: string;
    trustLevel: string | null;
    isAdmin: boolean;
    isTestUser: boolean;
    testUserKind: string | null;
    mustDeleteBeforePilot: boolean;
    createdAt: string | null;
  }>;
  unsafeNameOnlyMatches: Array<{
    id: string;
    displayName: string;
    reason: string;
  }>;
  touchedHouseholds: Array<{
    householdId: string;
    streetName: string | null;
    houseNumber: string | null;
    aiTestMembers: number;
    nonTestMembers: number;
  }>;
  referenceCounts: Array<{
    table: string;
    column: string;
    rows: number;
    error?: string;
  }>;
};

const USER_REFERENCE_TABLES = [
  ["household_members", "user_id"],
  ["verification_requests", "user_id"],
  ["invite_codes", "created_by"],
  ["alerts", "user_id"],
  ["alert_responses", "user_id"],
  ["help_requests", "user_id"],
  ["help_responses", "user_id"],
  ["marketplace_items", "user_id"],
  ["lost_found", "user_id"],
  ["event_participants", "user_id"],
  ["conversations", "created_by"],
  ["direct_messages", "sender_id"],
  ["neighbor_connections", "requester_id"],
  ["neighbor_connections", "addressee_id"],
  ["notifications", "user_id"],
  ["push_subscriptions", "user_id"],
  ["care_profiles", "user_id"],
  ["care_sos_alerts", "user_id"],
  ["care_checkins", "user_id"],
  ["care_audit_log", "actor_user_id"],
] as const;

export function assertAiTestCleanupDryRunMode(env: NodeJS.ProcessEnv | JsonRecord) {
  if (env.AI_TEST_CLEANUP_MODE !== "dry-run") {
    throw new Error("AI_TEST_CLEANUP_MODE muss exakt dry-run sein");
  }
}

export async function buildAiTestUsersCleanupDryRunReport(
  db: DryRunDb,
  now: Date = new Date(),
): Promise<AiTestUserCleanupDryRunReport> {
  const rawUsers = await loadAiTestCandidates(db);
  const adminBlocked = rawUsers.filter((user) => isBlockedAdminCandidate(user));

  if (adminBlocked.length > 0) {
    throw new Error(
      `Dry-Run abgebrochen: ${adminBlocked.length} Admin-Nutzer als AI-Testkandidat gefunden`,
    );
  }

  const aiUsers = rawUsers.filter((user) => user.settings?.is_test_user === true);
  const aiUserIds = aiUsers.map((user) => user.id);

  return {
    mode: "dry-run",
    generatedAt: now.toISOString(),
    aiTestUsers: aiUsers.map(toAiTestUserReport),
    unsafeNameOnlyMatches: rawUsers
      .filter((user) => isNameOnlyMatch(user))
      .map((user) => ({
        id: user.id,
        displayName: user.display_name ?? "",
        reason: "display_name beginnt mit AI-Test, aber settings.is_test_user ist nicht true",
      })),
    touchedHouseholds: await loadTouchedHouseholds(db, aiUserIds),
    referenceCounts: await loadReferenceCounts(db, aiUserIds),
  };
}

async function loadAiTestCandidates(db: DryRunDb): Promise<RawUser[]> {
  const result = await db
    .from("users")
    .select("id, display_name, trust_level, is_admin, settings, created_at")
    .or(
      "settings->>is_test_user.eq.true,settings->>test_user_kind.eq.ai_pilot,display_name.ilike.AI-Test%",
    )
    .order("created_at", { ascending: true });

  if (!result || result.error) {
    throw new Error(`AI-Testnutzer konnten nicht gelesen werden: ${result?.error?.message ?? "unbekannt"}`);
  }

  return (result.data ?? []) as RawUser[];
}

async function loadTouchedHouseholds(
  db: DryRunDb,
  aiUserIds: string[],
): Promise<AiTestUserCleanupDryRunReport["touchedHouseholds"]> {
  if (aiUserIds.length === 0) return [];

  const memberResult = await db
    .from("household_members")
    .select("household_id, user_id")
    .in("user_id", aiUserIds);

  if (!memberResult || memberResult.error) return [];

  const householdIds = uniqueStrings(
    (memberResult.data ?? []).map((row: JsonRecord) => row.household_id),
  );

  if (householdIds.length === 0) return [];

  const householdResult = await db
    .from("households")
    .select("id, street_name, house_number")
    .in("id", householdIds);
  const allMembersResult = await db
    .from("household_members")
    .select("household_id, user_id")
    .in("household_id", householdIds);

  if (!householdResult || householdResult.error || !allMembersResult || allMembersResult.error) {
    return [];
  }

  const allMemberUserIds = uniqueStrings(
    (allMembersResult.data ?? []).map((row: JsonRecord) => row.user_id),
  );
  const memberUsersResult = allMemberUserIds.length
    ? await db.from("users").select("id, settings").in("id", allMemberUserIds)
    : { data: [] };
  const userSettings = new Map<string, JsonRecord | null>(
    ((memberUsersResult?.data ?? []) as JsonRecord[]).map((row: JsonRecord) => [
      String(row.id),
      (row.settings as JsonRecord | null) ?? null,
    ]),
  );

  return ((householdResult.data ?? []) as JsonRecord[]).map((household) => {
    const members = ((allMembersResult.data ?? []) as JsonRecord[]).filter(
      (member) => member.household_id === household.id,
    );

    return {
      householdId: String(household.id),
      streetName: typeof household.street_name === "string" ? household.street_name : null,
      houseNumber: typeof household.house_number === "string" ? household.house_number : null,
      aiTestMembers: members.filter((member) => {
        const settings = userSettings.get(String(member.user_id));
        return settings?.is_test_user === true;
      }).length,
      nonTestMembers: members.filter((member) => {
        const settings = userSettings.get(String(member.user_id));
        return settings?.is_test_user !== true;
      }).length,
    };
  });
}

async function loadReferenceCounts(
  db: DryRunDb,
  aiUserIds: string[],
): Promise<AiTestUserCleanupDryRunReport["referenceCounts"]> {
  if (aiUserIds.length === 0) return [];

  const counts = [];

  for (const [table, column] of USER_REFERENCE_TABLES) {
    const result = await db.from(table).select("id", { count: "exact", head: true }).in(column, aiUserIds);
    counts.push({
      table,
      column,
      rows: result?.count ?? 0,
      ...(result?.error?.message ? { error: result.error.message } : {}),
    });
  }

  return counts;
}

function toAiTestUserReport(user: RawUser): AiTestUserCleanupDryRunReport["aiTestUsers"][number] {
  return {
    id: user.id,
    displayName: user.display_name ?? "",
    trustLevel: user.trust_level ?? null,
    isAdmin: user.is_admin === true,
    isTestUser: user.settings?.is_test_user === true,
    testUserKind: typeof user.settings?.test_user_kind === "string" ? user.settings.test_user_kind : null,
    mustDeleteBeforePilot: user.settings?.must_delete_before_pilot === true,
    createdAt: user.created_at ?? null,
  };
}

function isNameOnlyMatch(user: RawUser): boolean {
  return (
    user.settings?.is_test_user !== true &&
    typeof user.display_name === "string" &&
    user.display_name.startsWith("AI-Test ")
  );
}

function isBlockedAdminCandidate(user: RawUser): boolean {
  if (user.is_admin !== true || user.settings?.is_test_user !== true) return false;

  return !(
    user.settings.test_user_kind === "ai_pilot_admin" &&
    user.settings.founder_confirmed_admin_test_user === true
  );
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );
}
