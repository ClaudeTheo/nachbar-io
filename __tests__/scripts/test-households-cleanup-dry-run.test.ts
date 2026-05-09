import { describe, expect, it, vi } from "vitest";

import {
  assertTestHouseholdsCleanupDryRunMode,
  buildTestHouseholdsCleanupDryRunReport,
} from "@/lib/admin/test-households-cleanup-dry-run";

type MockQueryResult = {
  data?: Record<string, unknown>[] | null;
  error?: { message?: string } | null;
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

function createDb(householdsResult: MockQueryResult, membersResult?: MockQueryResult) {
  const householdsQuery = createQuery(householdsResult);
  const memberQuery = createQuery(membersResult ?? { data: [], error: null });
  const fallback = createQuery({ data: [], error: null });
  return {
    from: vi.fn((table: string) => {
      if (table === "households") return householdsQuery;
      if (table === "household_members") return memberQuery;
      return fallback;
    }),
  };
}

describe("Test-Households Cleanup-Dry-Run", () => {
  it("bricht ab, wenn Modus nicht exakt dry-run ist", () => {
    expect(() => assertTestHouseholdsCleanupDryRunMode({})).toThrow(
      "TEST_HOUSEHOLDS_CLEANUP_MODE muss exakt dry-run sein",
    );
    expect(() =>
      assertTestHouseholdsCleanupDryRunMode({ TEST_HOUSEHOLDS_CLEANUP_MODE: "dry-run" }),
    ).not.toThrow();
  });

  it("erkennt Households mit Whitespace-Drift (Trailing-Space) als datenkorrupt", async () => {
    const db = createDb({
      data: [
        {
          id: "house-trailing",
          street_name: "Purkersdorferstrasse ",
          house_number: "5",
          quarter_id: "q-bad",
          invite_code: "BS-001",
          verified: true,
          created_at: "2026-04-01T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildTestHouseholdsCleanupDryRunReport(db);

    expect(report.whitespaceDriftHouseholds).toHaveLength(1);
    expect(report.whitespaceDriftHouseholds[0]).toMatchObject({
      id: "house-trailing",
      streetName: "Purkersdorferstrasse ",
      trimmedStreetName: "Purkersdorferstrasse",
      reason: expect.stringContaining("Whitespace"),
    });
  });

  it("erkennt klar synthetische Test-Strasse 'E2E-Testweg'", async () => {
    const db = createDb({
      data: [
        {
          id: "house-e2e",
          street_name: "E2E-Testweg",
          house_number: "1",
          quarter_id: "q-bad",
          invite_code: "E2E-001",
          verified: true,
          created_at: "2026-04-19T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildTestHouseholdsCleanupDryRunReport(db);

    expect(report.syntheticTestHouseholds).toHaveLength(1);
    expect(report.syntheticTestHouseholds[0]).toMatchObject({
      id: "house-e2e",
      streetName: "E2E-Testweg",
      reason: expect.stringContaining("E2E-Testweg"),
    });
  });

  it("erkennt Demo-Quartier-Households via invite_code-Praefix '<QUARTIER>-TEST-'", async () => {
    const db = createDb({
      data: [
        {
          id: "house-rhein",
          street_name: "Friedrichstraße",
          house_number: "5",
          quarter_id: "q-rheinfelden",
          invite_code: "RHEIN-TEST-FS05",
          verified: true,
          created_at: "2026-03-01T08:00:00.000Z",
        },
        {
          id: "house-koeln",
          street_name: "Alter Markt",
          house_number: "20",
          quarter_id: "q-koeln",
          invite_code: "KOELN-TEST-AM20",
          verified: true,
          created_at: "2026-03-01T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildTestHouseholdsCleanupDryRunReport(db);

    expect(report.demoQuarterHouseholds).toHaveLength(2);
    expect(report.demoQuarterHouseholds.map((h) => h.id).sort()).toEqual([
      "house-koeln",
      "house-rhein",
    ]);
    expect(report.syntheticTestHouseholds).toHaveLength(0);
  });

  it("erkennt Strassen-Schreibvarianten als Drift (Purkersdorfer-Familie)", async () => {
    const db = createDb({
      data: [
        {
          id: "h1",
          street_name: "Purkersdorfer Straße",
          house_number: "1",
          quarter_id: "q-bad",
          invite_code: "BS-001",
          verified: true,
          created_at: "2026-04-01T08:00:00.000Z",
        },
        {
          id: "h2",
          street_name: "Purkersdorfer Str.",
          house_number: "2",
          quarter_id: "q-bad",
          invite_code: "BS-002",
          verified: true,
          created_at: "2026-04-01T08:00:00.000Z",
        },
        {
          id: "h3",
          street_name: "Purkersdorferstrasse",
          house_number: "3",
          quarter_id: "q-bad",
          invite_code: "BS-003",
          verified: true,
          created_at: "2026-04-01T08:00:00.000Z",
        },
        {
          id: "h4",
          street_name: "Sanarystraße",
          house_number: "1",
          quarter_id: "q-bad",
          invite_code: "BS-004",
          verified: true,
          created_at: "2026-04-01T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildTestHouseholdsCleanupDryRunReport(db);

    const purkersdorfer = report.streetVariants.find((v) =>
      v.canonical.toLowerCase().includes("purkersdorfer"),
    );
    expect(purkersdorfer).toBeDefined();
    expect(purkersdorfer?.variants.sort()).toEqual([
      "Purkersdorfer Str.",
      "Purkersdorfer Straße",
      "Purkersdorferstrasse",
    ]);
    expect(purkersdorfer?.householdCount).toBe(3);
    const sanary = report.streetVariants.find((v) =>
      v.canonical.toLowerCase().includes("sanary"),
    );
    expect(sanary).toBeUndefined();
  });

  it("liefert Summary-Counts und occupiedRate fuer jeden Bucket", async () => {
    const db = createDb(
      {
        data: [
          {
            id: "house-e2e",
            street_name: "E2E-Testweg",
            house_number: "1",
            quarter_id: "q-bad",
            invite_code: "E2E-001",
            verified: true,
            created_at: "2026-04-19T08:00:00.000Z",
          },
        ],
        error: null,
      },
      {
        data: [{ household_id: "house-e2e", user_id: "u1" }],
        error: null,
      },
    );

    const report = await buildTestHouseholdsCleanupDryRunReport(db);

    expect(report.summary.syntheticTestHouseholds).toBe(1);
    expect(report.summary.demoQuarterHouseholds).toBe(0);
    expect(report.summary.whitespaceDriftHouseholds).toBe(0);
    expect(report.summary.streetVariantGroups).toBe(0);
    expect(report.syntheticTestHouseholds[0].occupiedMembers).toBe(1);
  });

  it("ignoriert echtes Pilot-Household ohne Test-Pattern", async () => {
    const db = createDb({
      data: [
        {
          id: "house-real",
          street_name: "Purkersdorfer Straße",
          house_number: "5",
          quarter_id: "q-bad",
          invite_code: "BS-PILOT-001",
          verified: true,
          created_at: "2026-04-01T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildTestHouseholdsCleanupDryRunReport(db);

    expect(report.syntheticTestHouseholds).toHaveLength(0);
    expect(report.demoQuarterHouseholds).toHaveLength(0);
    expect(report.whitespaceDriftHouseholds).toHaveLength(0);
  });

  it("Allowlist-Quartiere via Option ueberspringen Demo-Bucket", async () => {
    const db = createDb({
      data: [
        {
          id: "house-rhein",
          street_name: "Friedrichstraße",
          house_number: "5",
          quarter_id: "q-rheinfelden",
          invite_code: "RHEIN-TEST-FS05",
          verified: true,
          created_at: "2026-03-01T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const report = await buildTestHouseholdsCleanupDryRunReport(db, {
      allowlistQuarterIds: ["q-rheinfelden"],
    });

    expect(report.demoQuarterHouseholds).toHaveLength(0);
    expect(report.allowlistSkips).toHaveLength(1);
    expect(report.allowlistSkips[0]).toMatchObject({
      id: "house-rhein",
      reason: "explicit-quarter-id",
    });
  });
});
