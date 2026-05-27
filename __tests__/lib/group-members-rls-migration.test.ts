import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260527183000_enable_rls_group_members.sql",
  ),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("20260527183000_enable_rls_group_members migration", () => {
  it("aktiviert RLS auf der Interest-Groups-Mitgliedschaft und korrigiert den Kommentar", () => {
    expect(SQL).toContain(
      "alter table public.group_members enable row level security",
    );
    expect(SQL).toContain("mitgliedschaft in interessengruppen");
    expect(SQL).toContain("nicht zu verwechseln mit chat_group_members");
  });

  it("entzieht anonymen Zugriff und erlaubt authenticated nur RLS-gesteuerte DML", () => {
    expect(SQL).toContain("revoke all on table public.group_members from anon");
    expect(SQL).toContain(
      "revoke all on table public.group_members from authenticated",
    );
    expect(SQL).toContain(
      "grant select, insert, update on table public.group_members to authenticated",
    );
    expect(SQL).not.toContain(
      "grant delete on table public.group_members to authenticated",
    );
    expect(SQL).not.toContain(
      "grant truncate on table public.group_members to authenticated",
    );
  });

  it("verwendet Security-Definer-Helper gegen RLS-Rekursion bei Admin- und Gruppenchecks", () => {
    expect(SQL).toContain(
      "create or replace function public.is_interest_group_admin",
    );
    expect(SQL).toContain(
      "create or replace function public.is_interest_group_member",
    );
    expect(SQL).toContain(
      "create or replace function public.is_interest_group_founder",
    );
    expect(SQL).toContain(
      "create or replace function public.is_interest_group_creator",
    );
    expect(SQL).toContain(
      "create or replace function public.can_found_interest_group",
    );
    expect(SQL).toContain(
      "create or replace function public.can_join_interest_group",
    );
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("set search_path = public, pg_temp");
    expect(SQL).toContain("revoke all on function public.is_interest_group_admin");
    expect(SQL).toContain("grant execute on function public.is_interest_group_admin");
    expect(SQL).toContain("revoke all on function public.can_join_interest_group");
    expect(SQL).toContain("grant execute on function public.can_join_interest_group");
  });

  it("schuetzt group_id/user_id und haelt member_count serverseitig konsistent", () => {
    expect(SQL).toContain(
      "create or replace function public.prevent_group_member_identity_change",
    );
    expect(SQL).toContain("before update of group_id, user_id");
    expect(SQL).toContain("group_id is distinct from old.group_id");
    expect(SQL).toContain("user_id is distinct from old.user_id");

    expect(SQL).toContain(
      "create or replace function public.refresh_group_member_count",
    );
    expect(SQL).toContain("after insert or delete or update of status");
    expect(SQL).toContain("set member_count = (");
    expect(SQL).toContain("gm.status = 'active'");
  });

  it("bewahrt die geplanten Produktregeln fuer offene, geschlossene und offizielle Gruppen", () => {
    expect(SQL).toContain("create policy group_members_select_scoped");
    expect(SQL).toContain("public.is_interest_group_member(group_id)");
    expect(SQL).toContain(
      "public.can_join_interest_group(group_id, array['open', 'official'])",
    );
    expect(SQL).toContain("hm.verified_at is not null");

    expect(SQL).toContain("create policy group_members_insert_self");
    expect(SQL).toContain("role = 'founder'");
    expect(SQL).toContain("role = 'member'");
    expect(SQL).toContain("public.can_found_interest_group(group_id)");
    expect(SQL).toContain(
      "public.can_join_interest_group(group_id, array['open'])",
    );
    expect(SQL).toContain(
      "public.can_join_interest_group(group_id, array['closed', 'official'])",
    );
    expect(SQL).toContain("status = 'pending'");
  });

  it("erlaubt kontrollierte Updates fuer eigene Zeilen und Gruppenadmins, aber keine DELETE-Policy", () => {
    expect(SQL).toContain("create policy group_members_update_self");
    expect(SQL).toContain("create policy group_members_update_group_admin");
    expect(SQL).toContain("role <> 'founder'");
    expect(SQL).toContain("status in ('active', 'pending', 'removed')");
    expect(SQL).not.toContain("for delete");
  });
});
