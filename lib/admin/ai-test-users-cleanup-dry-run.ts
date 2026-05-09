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
  email?: string | null;
  trust_level: string | null;
  is_admin: boolean | null;
  settings: JsonRecord | null;
  created_at: string | null;
};

// Founder-Mail wird NIE als Loeschkandidat eingestuft. Weitere Allowlist-IDs
// laufen ueber DryRunOptions.allowlistUserIds (typisch: Pilot-Onboarding-Test-User).
export const FOUNDER_ALLOWLIST_EMAILS = ["thomasth@gmx.de"] as const;

// KI-Synthetik-Namen folgen dem Muster "Vorname X." (z.B. "Petra K.").
const KI_SYNTHETIC_NAME_PATTERN = /^[A-Za-zÄÖÜäöüß]+\s[A-Z]\.$/;

export type DryRunOptions = {
  // Strict-Modus: nur die historischen Selektoren (is_test_user, test_user_kind=ai_pilot, AI-Test%).
  // Default false — zusaetzliche Synthetik-Patterns werden in unmarkedSyntheticCandidates gemeldet.
  strict?: boolean;
  // ISO 8601 oder YYYY-MM-DD. Nur User mit created_at < before kommen in den Synthetik-Bucket.
  before?: string;
  // Zusaetzliche Email-Allowlist (z.B. weitere Founder).
  allowlistEmails?: readonly string[];
  // Allowlist nach User-ID (z.B. Pilot-Onboarding-Test-Konten Codex/Claude).
  allowlistUserIds?: readonly string[];
};

export type AiTestUserCleanupDryRunReport = {
  mode: "dry-run";
  generatedAt: string;
  options: {
    strict: boolean;
    before: string | null;
  };
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
  unmarkedSyntheticCandidates: Array<{
    id: string;
    displayName: string;
    email: string | null;
    reason: string;
    createdAt: string | null;
  }>;
  allowlistSkips: Array<{
    id: string;
    displayName: string;
    email: string | null;
    reason: "founder-email" | "explicit-user-id";
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

export const AI_TEST_USER_REFERENCE_TABLES = [
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
  options: DryRunOptions = {},
  now: Date = new Date(),
): Promise<AiTestUserCleanupDryRunReport> {
  const strict = options.strict === true;
  const before = options.before ?? null;
  const beforeTime = before ? Date.parse(before) : null;
  const allowlistEmails = new Set<string>(
    [...FOUNDER_ALLOWLIST_EMAILS, ...(options.allowlistEmails ?? [])].map((e) =>
      e.toLowerCase(),
    ),
  );
  const allowlistUserIds = new Set<string>(options.allowlistUserIds ?? []);

  const rawUsers = await loadAiTestCandidates(db, { strict });
  const adminBlocked = rawUsers.filter((user) => isBlockedAdminCandidate(user));

  if (adminBlocked.length > 0) {
    throw new Error(
      `Dry-Run abgebrochen: ${adminBlocked.length} Admin-Nutzer als AI-Testkandidat gefunden`,
    );
  }

  const allowlistSkips: AiTestUserCleanupDryRunReport["allowlistSkips"] = [];
  const remainingUsers: RawUser[] = [];
  for (const user of rawUsers) {
    const email = typeof user.email === "string" ? user.email : null;
    const emailLower = email?.toLowerCase() ?? null;
    if (emailLower && allowlistEmails.has(emailLower)) {
      allowlistSkips.push({
        id: user.id,
        displayName: user.display_name ?? "",
        email,
        reason: "founder-email",
      });
      continue;
    }
    if (allowlistUserIds.has(user.id)) {
      allowlistSkips.push({
        id: user.id,
        displayName: user.display_name ?? "",
        email,
        reason: "explicit-user-id",
      });
      continue;
    }
    remainingUsers.push(user);
  }

  const aiUsers = remainingUsers.filter(
    (user) => user.settings?.is_test_user === true,
  );
  const aiUserIds = aiUsers.map((user) => user.id);

  const unmarkedSyntheticCandidates: AiTestUserCleanupDryRunReport["unmarkedSyntheticCandidates"] =
    strict
      ? []
      : remainingUsers
          .filter((user) => user.settings?.is_test_user !== true)
          .map((user) => {
            const reason = classifySyntheticReason(user.display_name);
            if (!reason) return null;
            if (beforeTime !== null && user.created_at) {
              const created = Date.parse(user.created_at);
              if (Number.isFinite(created) && created >= beforeTime) {
                return null;
              }
            }
            return {
              id: user.id,
              displayName: user.display_name ?? "",
              email: typeof user.email === "string" ? user.email : null,
              reason,
              createdAt: user.created_at ?? null,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    mode: "dry-run",
    generatedAt: now.toISOString(),
    options: { strict, before },
    aiTestUsers: aiUsers.map(toAiTestUserReport),
    unmarkedSyntheticCandidates,
    allowlistSkips,
    unsafeNameOnlyMatches: remainingUsers
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

function classifySyntheticReason(displayName: string | null): string | null {
  if (!displayName) return null;
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return null;

  if (trimmed === "E2E Testnutzer" || trimmed.startsWith("E2E Testnutzer ")) {
    return "Name 'E2E Testnutzer' (synthetisch, ohne is_test_user Flag)";
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("ai-test") || lower.startsWith("test-")) {
    return "Praefix 'ai-test'/'test-' (synthetisch, ohne is_test_user Flag)";
  }
  if (KI_SYNTHETIC_NAME_PATTERN.test(trimmed)) {
    return "KI-Synthetik-Pattern 'Vorname X.' (z.B. Petra K., Xaver U.)";
  }
  return null;
}

async function loadAiTestCandidates(
  db: DryRunDb,
  config: { strict: boolean },
): Promise<RawUser[]> {
  const baseFilters = [
    "settings->>is_test_user.eq.true",
    "settings->>test_user_kind.eq.ai_pilot",
    "display_name.ilike.AI-Test%",
  ];
  const extendedFilters = config.strict
    ? baseFilters
    : [
        ...baseFilters,
        "display_name.ilike.E2E Testnutzer%",
        "display_name.ilike.ai-test%",
        "display_name.ilike.test-%",
        // Postgres LIKE: matched alles mit "% X." am Ende (Petra K., Klara S., ...)
        "display_name.like.% _.",
      ];

  const result = await db
    .from("users")
    .select("id, display_name, email, trust_level, is_admin, settings, created_at")
    .or(extendedFilters.join(","))
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

  for (const [table, column] of AI_TEST_USER_REFERENCE_TABLES) {
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
