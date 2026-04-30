import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_114 = readFileSync(
  join(process.cwd(), "supabase", "migrations", "114_civic_portal.sql"),
  "utf8",
);

describe("civic portal migration", () => {
  it("erstellt civic_members bevor Policies darauf referenzieren", () => {
    const tableIndex = MIGRATION_114.indexOf(
      "CREATE TABLE IF NOT EXISTS civic_members",
    );
    const policyIndex = MIGRATION_114.indexOf(
      'CREATE POLICY "civic_org_select"',
    );

    expect(tableIndex).toBeGreaterThanOrEqual(0);
    expect(policyIndex).toBeGreaterThanOrEqual(0);
    expect(tableIndex).toBeLessThan(policyIndex);
  });
});
