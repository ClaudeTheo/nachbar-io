import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "197_family_setup_invitations.sql"),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("197_family_setup_invitations migration", () => {
  it("creates the family setup tables with hashed token storage", () => {
    expect(SQL).toContain("create table if not exists family_child_links");
    expect(SQL).toContain("create table if not exists family_setup_invitations");
    expect(SQL).toContain("create table if not exists family_setup_audit");
    expect(SQL).toContain("token_hash text not null unique");
    expect(SQL).toContain("short_code_hash text unique");
    expect(SQL).not.toContain("raw_token");
  });

  it("enables RLS for all new family setup tables", () => {
    expect(SQL).toContain("alter table family_child_links enable row level security");
    expect(SQL).toContain("alter table family_setup_invitations enable row level security");
    expect(SQL).toContain("alter table family_setup_audit enable row level security");
  });

  it("constrains setup flows, statuses and target ui modes", () => {
    expect(SQL).toContain("flow_type in ('child_direct', 'child_friend', 'senior_setup')");
    expect(SQL).toContain("status in ('pending_parent_approval', 'ready', 'claimed', 'expired', 'revoked', 'needs_admin_review')");
    expect(SQL).toContain("target_ui_mode in ('youth', 'senior', 'comfort')");
  });

  it("extends caregiver_links additively for senior setup consent", () => {
    expect(SQL).toContain("alter table caregiver_links");
    expect(SQL).toContain("add column if not exists setup_origin text");
    expect(SQL).toContain("add column if not exists consent_status text not null default 'active'");
    expect(SQL).toContain("add column if not exists profile_edit_allowed boolean not null default false");
    expect(SQL).toContain("add column if not exists sensitive_data_allowed boolean not null default false");
  });
});
