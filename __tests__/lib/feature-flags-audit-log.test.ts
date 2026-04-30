import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "176_feature_flags_audit_log.sql",
  ),
  "utf8",
);

describe("feature_flags_audit_log migration", () => {
  it("legt Tabelle, Reason-Spalte und Trigger idempotent an", () => {
    expect(MIGRATION).toContain(
      "add column if not exists last_change_reason text",
    );
    expect(MIGRATION).toContain(
      "create table if not exists public.feature_flags_audit_log",
    );
    expect(MIGRATION).toContain(
      "create or replace function public.log_feature_flag_change()",
    );
    expect(MIGRATION).toContain("feature_flags_audit_log_trigger");
    expect(MIGRATION).toContain("after insert or update or delete");
  });

  it("schreibt INSERT-Audit mit action insert und enabled_before null", () => {
    expect(MIGRATION).toContain("lower(tg_op)");
    expect(MIGRATION).toContain(
      "case when tg_op = 'INSERT' then null else old.enabled end",
    );
  });

  it("schreibt UPDATE-Audit mit enabled_before und enabled_after", () => {
    expect(MIGRATION).toContain(
      "case when tg_op = 'DELETE' then null else new.enabled end",
    );
    expect(MIGRATION).toContain("old.enabled");
    expect(MIGRATION).toContain("new.enabled");
  });

  it("schreibt DELETE-Audit mit enabled_after null", () => {
    expect(MIGRATION).toContain(
      "case when tg_op = 'DELETE' then old.key else new.key end",
    );
    expect(MIGRATION).toContain(
      "case when tg_op = 'DELETE' then null else new.enabled end",
    );
    expect(MIGRATION).toContain("if tg_op = 'DELETE' then");
    expect(MIGRATION).toContain("return old");
  });

  it("reicht Reason aus last_change_reason ins Audit-Log durch", () => {
    expect(MIGRATION).toContain("reason");
    expect(MIGRATION).toContain("new.last_change_reason");
    expect(MIGRATION).toContain("old.last_change_reason");
  });
});
