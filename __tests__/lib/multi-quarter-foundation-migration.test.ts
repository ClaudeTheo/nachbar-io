import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_051 = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "051_multi_quarter_foundation.sql",
  ),
  "utf8",
);

describe("multi quarter foundation migration", () => {
  it("definiert is_super_admin vor quarter_admins-Policies", () => {
    const functionIndex = MIGRATION_051.indexOf(
      "CREATE OR REPLACE FUNCTION is_super_admin()",
    );
    const policyIndex = MIGRATION_051.indexOf(
      "CREATE POLICY quarter_admins_super_admin",
    );

    expect(functionIndex).toBeGreaterThanOrEqual(0);
    expect(policyIndex).toBeGreaterThanOrEqual(0);
    expect(functionIndex).toBeLessThan(policyIndex);
  });
});
