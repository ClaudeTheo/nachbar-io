import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const SEED_SQL = readFileSync(
  join(process.cwd(), "supabase", "seed.sql"),
  "utf8",
);

describe("local seed replay", () => {
  it("stellt das Pilotquartier vor den Household-Seeds wieder her", () => {
    const quarterInsertIndex = SEED_SQL.indexOf("INSERT INTO quarters");
    const firstHouseholdInsertIndex = SEED_SQL.indexOf("INSERT INTO households");

    expect(quarterInsertIndex).toBeGreaterThanOrEqual(0);
    expect(firstHouseholdInsertIndex).toBeGreaterThan(quarterInsertIndex);
    expect(SEED_SQL).toContain("'bad-saeckingen-pilot'");
  });

  it("setzt quarter_id bei allen Household-Seed-Inserts", () => {
    const householdInsertColumns = SEED_SQL.match(
      /INSERT INTO households \(([^)]+)\) VALUES/g,
    );

    expect(householdInsertColumns).not.toBeNull();
    expect(householdInsertColumns).not.toHaveLength(0);
    for (const insertStatement of householdInsertColumns ?? []) {
      expect(insertStatement).toContain("quarter_id");
    }
  });

  it("setzt gueltige Rollen fuer User-Seeds nach Migration 175", () => {
    const userInsertHeader = SEED_SQL.match(/INSERT INTO users \(([^)]+)\) VALUES/);

    expect(userInsertHeader).not.toBeNull();
    expect(userInsertHeader?.[1]).toContain("role");
    expect(SEED_SQL).not.toContain("'user'");
  });
});
