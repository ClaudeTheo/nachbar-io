import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260527191000_restore_interest_groups_rls.sql",
  ),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("20260527191000_restore_interest_groups_rls migration", () => {
  it("aktiviert RLS fuer die restlichen Interest-Groups-Tabellen", () => {
    for (const table of [
      "groups",
      "group_posts",
      "group_post_comments",
      "group_notification_settings",
    ]) {
      expect(SQL).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(SQL).toContain(`revoke all on table public.${table} from anon`);
      expect(SQL).toContain(
        `revoke all on table public.${table} from authenticated`,
      );
    }
  });

  it("raeumt historische Prod-Policy-Namen weg, damit keine breiten Alt-Policies stehen bleiben", () => {
    for (const policy of [
      "groups_select",
      "groups_insert",
      "groups_update",
      "groups_delete",
      "gp_select",
      "gp_insert",
      "gp_delete",
      "gpc_select",
      "gpc_insert",
      "gpc_delete",
      "gns_all",
    ]) {
      expect(SQL).toContain(`drop policy if exists ${policy}`);
    }
  });

  it("entfernt breite Gruppenrechte und erlaubt nur benoetigte authenticated-Aktionen", () => {
    expect(SQL).toContain(
      "grant select, insert, delete on table public.groups to authenticated",
    );
    expect(SQL).toContain(
      "grant update (name, description, category, type, updated_at) on table public.groups to authenticated",
    );
    expect(SQL).toContain(
      "grant select, insert, delete on table public.group_posts to authenticated",
    );
    expect(SQL).toContain(
      "grant select, insert, delete on table public.group_post_comments to authenticated",
    );
    expect(SQL).toContain(
      "grant select, insert, update, delete on table public.group_notification_settings to authenticated",
    );
    expect(SQL).not.toContain("grant truncate");
  });

  it("nutzt Security-Definer-Helper fuer Quartier- und Post-Sichtbarkeit", () => {
    expect(SQL).toContain(
      "create or replace function public.is_verified_in_quarter",
    );
    expect(SQL).toContain(
      "create or replace function public.can_read_interest_group_post",
    );
    expect(SQL).toContain(
      "create or replace function public.can_comment_interest_group_post",
    );
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("set search_path = public, pg_temp");
    expect(SQL).toContain("hm.verified_at is not null");
  });

  it("schuetzt quarter_id und creator_id auf groups", () => {
    expect(SQL).toContain(
      "create or replace function public.prevent_group_identity_change",
    );
    expect(SQL).toContain("before update of quarter_id, creator_id");
    expect(SQL).toContain("quarter_id is distinct from old.quarter_id");
    expect(SQL).toContain("creator_id is distinct from old.creator_id");
  });

  it("definiert quarter-scoped Gruppen-Policies und Admin-Verwaltung", () => {
    expect(SQL).toContain("create policy groups_select_quarter");
    expect(SQL).toContain("public.is_verified_in_quarter(quarter_id)");
    expect(SQL).toContain("create policy groups_insert_creator");
    expect(SQL).toContain("creator_id = auth.uid()");
    expect(SQL).toContain("member_count = 1");
    expect(SQL).toContain("create policy groups_update_admin");
    expect(SQL).toContain("public.is_interest_group_admin(id)");
    expect(SQL).toContain("create policy groups_delete_founder");
    expect(SQL).toContain("public.is_interest_group_founder(id)");
  });

  it("definiert Post-, Kommentar- und Notification-Policies", () => {
    expect(SQL).toContain("create policy group_posts_select_visible");
    expect(SQL).toContain("create policy group_posts_insert_member");
    expect(SQL).toContain("public.is_interest_group_member(group_id)");

    expect(SQL).toContain("create policy group_post_comments_select_visible");
    expect(SQL).toContain("create policy group_post_comments_insert_member");
    expect(SQL).toContain("public.can_read_interest_group_post(post_id)");
    expect(SQL).toContain("public.can_comment_interest_group_post(post_id)");

    expect(SQL).toContain(
      "create policy group_notification_settings_select_own",
    );
    expect(SQL).toContain(
      "create policy group_notification_settings_insert_own",
    );
    expect(SQL).toContain("user_id = auth.uid()");
  });
});
