import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "195_generation_ui_modes.sql",
);

const ROLLBACK_PATH = join(
  process.cwd(),
  "supabase",
  "rollbacks",
  "195_generation_ui_modes.down.sql",
);

describe("195_generation_ui_modes migration", () => {
  it("erweitert die users.ui_mode-Constraint file-first um youth und comfort", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, "utf8").toLowerCase();

    expect(sql).toContain("alter table public.users");
    expect(sql).toContain("drop constraint if exists users_ui_mode_check");
    expect(sql).toContain("add constraint users_ui_mode_check");
    expect(sql).toContain("'youth'");
    expect(sql).toContain("'active'");
    expect(sql).toContain("'comfort'");
    expect(sql).toContain("'senior'");
  });

  it("enthaelt ein Rollback auf die bisher erlaubten Modi", () => {
    expect(existsSync(ROLLBACK_PATH)).toBe(true);

    const sql = readFileSync(ROLLBACK_PATH, "utf8").toLowerCase();

    expect(sql).toContain("update public.users");
    expect(sql).toContain("where ui_mode in ('youth', 'comfort')");
    expect(sql).toContain("add constraint users_ui_mode_check");
    expect(sql).toContain("ui_mode in ('active', 'senior')");
  });
});
