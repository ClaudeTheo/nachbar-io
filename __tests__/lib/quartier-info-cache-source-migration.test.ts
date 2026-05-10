import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "191_quartier_info_cache_oepnv_source.sql",
);

const ROLLBACK_PATH = join(
  process.cwd(),
  "supabase",
  "rollbacks",
  "191_quartier_info_cache_oepnv_source.down.sql",
);

describe("191_quartier_info_cache_oepnv_source migration", () => {
  it("erweitert die Cache-Source-Constraint idempotent um oepnv", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, "utf8").toLowerCase();

    expect(sql).toContain("alter table public.quartier_info_cache");
    expect(sql).toContain("drop constraint if exists quartier_info_cache_source_check");
    expect(sql).toContain("add constraint quartier_info_cache_source_check");
    expect(sql).toContain("'weather'");
    expect(sql).toContain("'pollen'");
    expect(sql).toContain("'nina'");
    expect(sql).toContain("'oepnv'");
  });

  it("enthaelt ein Rollback auf die urspruenglichen Cache-Sources", () => {
    expect(existsSync(ROLLBACK_PATH)).toBe(true);

    const sql = readFileSync(ROLLBACK_PATH, "utf8").toLowerCase();

    expect(sql).toContain("delete from public.quartier_info_cache");
    expect(sql).toContain("where source = 'oepnv'");
    expect(sql).toContain("add constraint quartier_info_cache_source_check");
    expect(sql).toContain("source in ('weather', 'pollen', 'nina')");
  });
});
