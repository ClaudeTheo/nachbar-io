import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "188_municipal_config_sync_meta.sql",
);

describe("188_municipal_config_sync_meta migration", () => {
  it("legt sync_meta als idempotentes JSONB-Feld mit leerem Default an", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, "utf8").toLowerCase();

    expect(sql).toContain("alter table public.municipal_config");
    expect(sql).toContain("add column if not exists sync_meta jsonb");
    expect(sql).toContain("not null default '{}'::jsonb");
    expect(sql).toContain("comment on column public.municipal_config.sync_meta");
  });
});
