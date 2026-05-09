type JsonRecord = Record<string, unknown>;

type QueryResult<T = unknown> = {
  data?: T[] | null;
  error?: { message?: string } | null;
};

type QueryBuilder<T = JsonRecord> = {
  select: (columns: string) => QueryBuilder<T>;
  or: (filters: string) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => Promise<QueryResult<T>>;
  in: (column: string, values: readonly string[]) => Promise<QueryResult<T>>;
};

export type TestHouseholdsDryRunDb = {
  from: (table: string) => QueryBuilder;
};

type RawHousehold = {
  id: string;
  street_name: string | null;
  house_number: string | null;
  quarter_id: string | null;
  invite_code: string | null;
  verified: boolean | null;
  created_at: string | null;
};

type HouseholdReportRow = {
  id: string;
  streetName: string;
  houseNumber: string | null;
  quarterId: string | null;
  inviteCode: string | null;
  reason: string;
  occupiedMembers: number;
  createdAt: string | null;
};

export type TestHouseholdsCleanupDryRunOptions = {
  allowlistQuarterIds?: readonly string[];
};

export type TestHouseholdsCleanupDryRunReport = {
  mode: "dry-run";
  generatedAt: string;
  summary: {
    syntheticTestHouseholds: number;
    demoQuarterHouseholds: number;
    whitespaceDriftHouseholds: number;
    streetVariantGroups: number;
    allowlistSkips: number;
  };
  syntheticTestHouseholds: HouseholdReportRow[];
  demoQuarterHouseholds: HouseholdReportRow[];
  whitespaceDriftHouseholds: Array<HouseholdReportRow & { trimmedStreetName: string }>;
  streetVariants: Array<{
    canonical: string;
    variants: string[];
    householdCount: number;
  }>;
  allowlistSkips: Array<{
    id: string;
    streetName: string;
    quarterId: string | null;
    reason: "explicit-quarter-id";
  }>;
};

const SYNTHETIC_STREET_NAMES = new Set<string>(["E2E-Testweg"]);

// Konvention aus Mig 125: <QUARTIER>-TEST-... markiert Demo-Quartier-Households (Rheinfelden, Koeln).
const DEMO_INVITE_CODE_PATTERN = /^[A-Z]+-TEST-/;

export function assertTestHouseholdsCleanupDryRunMode(env: NodeJS.ProcessEnv | JsonRecord) {
  if (env.TEST_HOUSEHOLDS_CLEANUP_MODE !== "dry-run") {
    throw new Error("TEST_HOUSEHOLDS_CLEANUP_MODE muss exakt dry-run sein");
  }
}

export async function buildTestHouseholdsCleanupDryRunReport(
  db: TestHouseholdsDryRunDb,
  options: TestHouseholdsCleanupDryRunOptions = {},
  now: Date = new Date(),
): Promise<TestHouseholdsCleanupDryRunReport> {
  const allowlistQuarterIds = new Set<string>(options.allowlistQuarterIds ?? []);

  const households = await loadHouseholds(db);
  const occupiedCounts = await loadOccupiedCounts(db, households.map((h) => h.id));

  const allowlistSkips: TestHouseholdsCleanupDryRunReport["allowlistSkips"] = [];
  const remaining: RawHousehold[] = [];
  for (const h of households) {
    if (h.quarter_id && allowlistQuarterIds.has(h.quarter_id)) {
      allowlistSkips.push({
        id: h.id,
        streetName: h.street_name ?? "",
        quarterId: h.quarter_id,
        reason: "explicit-quarter-id",
      });
      continue;
    }
    remaining.push(h);
  }

  const syntheticTestHouseholds: HouseholdReportRow[] = [];
  const demoQuarterHouseholds: HouseholdReportRow[] = [];
  const whitespaceDriftHouseholds: TestHouseholdsCleanupDryRunReport["whitespaceDriftHouseholds"] =
    [];

  for (const h of remaining) {
    const street = h.street_name ?? "";
    const occupied = occupiedCounts.get(h.id) ?? 0;
    const baseRow: HouseholdReportRow = {
      id: h.id,
      streetName: street,
      houseNumber: h.house_number ?? null,
      quarterId: h.quarter_id ?? null,
      inviteCode: h.invite_code ?? null,
      reason: "",
      occupiedMembers: occupied,
      createdAt: h.created_at ?? null,
    };

    const trimmed = street.trim();
    if (street !== trimmed && street.length > 0) {
      whitespaceDriftHouseholds.push({
        ...baseRow,
        trimmedStreetName: trimmed,
        reason:
          "Whitespace-Drift im Strassennamen (Trim-Trigger fehlt). Nicht loeschen, sondern UPDATE TRIM.",
      });
      continue;
    }

    if (SYNTHETIC_STREET_NAMES.has(trimmed)) {
      syntheticTestHouseholds.push({
        ...baseRow,
        reason: `Klar synthetische Strasse '${trimmed}' (E2E-Test-Konvention)`,
      });
      continue;
    }

    if (h.invite_code && DEMO_INVITE_CODE_PATTERN.test(h.invite_code)) {
      demoQuarterHouseholds.push({
        ...baseRow,
        reason: `Demo-Quartier-Praefix im invite_code '${h.invite_code}' (vor Pilot pruefen, ob Quartier behalten)`,
      });
      continue;
    }
  }

  const streetVariants = computeStreetVariants(remaining);

  return {
    mode: "dry-run",
    generatedAt: now.toISOString(),
    summary: {
      syntheticTestHouseholds: syntheticTestHouseholds.length,
      demoQuarterHouseholds: demoQuarterHouseholds.length,
      whitespaceDriftHouseholds: whitespaceDriftHouseholds.length,
      streetVariantGroups: streetVariants.length,
      allowlistSkips: allowlistSkips.length,
    },
    syntheticTestHouseholds,
    demoQuarterHouseholds,
    whitespaceDriftHouseholds,
    streetVariants,
    allowlistSkips,
  };
}

async function loadHouseholds(db: TestHouseholdsDryRunDb): Promise<RawHousehold[]> {
  const result = await db
    .from("households")
    .select("id, street_name, house_number, quarter_id, invite_code, verified, created_at")
    .order("created_at", { ascending: true });
  if (!result || result.error) {
    throw new Error(
      `Households konnten nicht gelesen werden: ${result?.error?.message ?? "unbekannt"}`,
    );
  }
  return (result.data ?? []) as RawHousehold[];
}

async function loadOccupiedCounts(
  db: TestHouseholdsDryRunDb,
  householdIds: string[],
): Promise<Map<string, number>> {
  if (householdIds.length === 0) return new Map();
  const result = await db
    .from("household_members")
    .select("household_id, user_id")
    .in("household_id", householdIds);
  if (!result || result.error) return new Map();
  const counts = new Map<string, number>();
  for (const row of (result.data ?? []) as JsonRecord[]) {
    const id = String(row.household_id ?? "");
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function computeStreetVariants(
  households: RawHousehold[],
): TestHouseholdsCleanupDryRunReport["streetVariants"] {
  const buckets = new Map<string, { variants: Set<string>; count: number }>();
  for (const h of households) {
    const street = h.street_name?.trim();
    if (!street) continue;
    const key = canonicalizeStreet(street);
    const bucket = buckets.get(key) ?? { variants: new Set<string>(), count: 0 };
    bucket.variants.add(street);
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const variants: TestHouseholdsCleanupDryRunReport["streetVariants"] = [];
  for (const [canonical, bucket] of buckets) {
    if (bucket.variants.size <= 1) continue;
    variants.push({
      canonical,
      variants: [...bucket.variants].sort(),
      householdCount: bucket.count,
    });
  }
  return variants.sort((a, b) => a.canonical.localeCompare(b.canonical));
}

function canonicalizeStreet(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/ß/g, "ss")
    .replace(/str\./g, "strasse")
    .replace(/straße/g, "strasse");
}
