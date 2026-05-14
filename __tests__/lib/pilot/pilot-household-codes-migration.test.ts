import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(process.cwd(), "supabase", "migrations", "198_pilot_household_access_codes.sql"),
  "utf8",
).toLowerCase();

describe("198_pilot_household_access_codes migration", () => {
  it("creates a household-bound pilot code inventory", () => {
    expect(SQL).toContain("create table if not exists pilot_household_access_codes");
    expect(SQL).toContain("household_id uuid references households(id)");
    expect(SQL).toContain("code_hash text not null unique");
    expect(SQL).toContain("code_hint text not null");
    expect(SQL).not.toContain("raw_code");
  });

  it("models primary and replacement codes with claim status", () => {
    expect(SQL).toContain("code_kind text not null");
    expect(SQL).toContain("'primary'");
    expect(SQL).toContain("'replacement'");
    expect(SQL).toContain("status text not null default 'available'");
    expect(SQL).toContain("'claimed'");
    expect(SQL).toContain("'assigned'");
    expect(SQL).toContain("'revoked'");
  });

  it("enables rls and admin-safe policies", () => {
    expect(SQL).toContain("alter table pilot_household_access_codes enable row level security");
    expect(SQL).toContain("is_super_admin()");
    expect(SQL).toContain("is_quarter_admin_for(quarter_id)");
  });
});
