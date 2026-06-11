import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "199_quarter_collection_areas_security_invoker.sql",
);

const ROLLBACK_PATH = join(
  process.cwd(),
  "supabase",
  "rollbacks",
  "199_quarter_collection_areas_security_invoker.down.sql",
);

describe("199_quarter_collection_areas_security_invoker migration", () => {
  it("sets the waste-area view to security invoker", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, "utf8").toLowerCase();

    expect(sql).toContain("alter view public.quarter_collection_areas");
    expect(sql).toContain("set (security_invoker = true)");
    expect(sql).not.toContain("create or replace view");
  });

  it("keeps the migration idempotent for branch/prod drift", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8").toLowerCase();

    expect(sql).toContain("to_regclass('public.quarter_collection_areas')");
    expect(sql).toContain("do $$");
  });

  it("provides a rollback for the view option", () => {
    expect(existsSync(ROLLBACK_PATH)).toBe(true);

    const rollback = readFileSync(ROLLBACK_PATH, "utf8").toLowerCase();

    expect(rollback).toContain("alter view public.quarter_collection_areas");
    expect(rollback).toContain("reset (security_invoker)");
  });
});
