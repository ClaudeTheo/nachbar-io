import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_019 = readFileSync(
  join(process.cwd(), "supabase", "migrations", "019_care_shared_functions.sql"),
  "utf8",
);

describe("care shared functions migration", () => {
  it("kann vor der care_helpers-Tabelle replayt werden", () => {
    expect(MIGRATION_019).toContain("to_regclass('public.care_helpers')");
    expect(MIGRATION_019).toContain("EXECUTE");
    expect(MIGRATION_019).not.toMatch(/LANGUAGE sql SECURITY DEFINER STABLE/);
  });
});
