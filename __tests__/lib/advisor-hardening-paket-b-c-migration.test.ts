import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const migrationPath = (name: string) =>
  join(process.cwd(), "supabase", "migrations", name);
const rollbackPath = (name: string) =>
  join(process.cwd(), "supabase", "rollbacks", name);

describe("advisor hardening package B migration", () => {
  const upPath = migrationPath("201_advisor_scoped_rls_fixes.sql");
  const downPath = rollbackPath("201_advisor_scoped_rls_fixes.down.sql");

  it("ships file-first up and rollback migrations", () => {
    expect(existsSync(upPath)).toBe(true);
    expect(existsSync(downPath)).toBe(true);
  });

  it("closes the critical users insert policy and sanitizes privileged fields", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();

    expect(sql).toContain("create policy users_insert on public.users");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("with check (id = auth.uid())");
    expect(sql).toContain(
      "create or replace function public.enforce_user_insert_restrictions()",
    );
    expect(sql).toContain("new.is_admin := false");
    expect(sql).toContain("new.role := 'resident'");
    expect(sql).toContain("new.trust_level := 'new'");
    expect(sql).toContain("new.total_points := 0");
    expect(sql).toContain("new.points_level := 1");
    expect(sql).toContain("current_setting('role', true) = 'service_role'");
  });

  it("scopes user-owned writes and removes service-only public policies", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();

    expect(sql).toContain(
      "create policy neighbor_invitations_update on public.neighbor_invitations",
    );
    expect(sql).toContain("using (inviter_id = auth.uid() or public.is_admin())");

    for (const policy of [
      "youth_profiles_insert_service",
      "youth_earned_badges_insert_service",
      "points_log_insert_service",
      "user_badges_insert_service",
      "reputation_points_insert",
    ]) {
      expect(sql).toContain(`drop policy if exists \"${policy}\"`);
    }
    expect(sql).toContain("with check (user_id = auth.uid())");

    for (const policy of [
      "passkey_challenges_insert",
      "passkey_challenges_select",
      "passkey_challenges_delete",
      "user_blocks_service",
      "warning_cache_service_insert",
      "warning_cache_service_delete",
      "cron_job_runs_service",
      "civic_audit_log_service_insert",
      "civic_members_service_insert",
      "civic_messages_service_insert",
      "civic_org_service_insert",
    ]) {
      expect(sql).toContain(`drop policy if exists \"${policy}\"`);
    }
  });

  it("limits finance tables to authenticated platform admins", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();

    for (const table of [
      "invoices",
      "monthly_summaries",
      "business_settings",
      "business_transactions",
    ]) {
      expect(sql).toContain(`on public.${table}`);
    }
    expect(sql).toContain("using (public.is_admin())");
    expect(sql).toContain("with check (public.is_admin())");
  });

  it("runs atomically", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
  });
});

describe("advisor hardening package C migration", () => {
  const upPath = migrationPath("202_advisor_function_hardening.sql");
  const downPath = rollbackPath("202_advisor_function_hardening.down.sql");

  it("ships file-first up and rollback migrations", () => {
    expect(existsSync(upPath)).toBe(true);
    expect(existsSync(downPath)).toBe(true);
  });

  it("pins all 31 advisor-listed function search paths", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();
    const pinned = sql.match(/set search_path = public, pg_temp/g) ?? [];
    expect(pinned).toHaveLength(31);
    expect(sql).toContain(
      "alter function public.assign_point_to_quarter(geometry, text, text, text, text)",
    );
    expect(sql).toContain(
      "alter function public.find_nearest_seeding_quarter(double precision, double precision, double precision)",
    );
    expect(sql).toContain(
      "alter function public.validate_house_in_quarter_boundary()",
    );
  });

  it("revokes public API execution from trigger and cron-only functions", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();

    for (const fn of [
      "add_chat_group_creator_as_admin()",
      "check_quarter_lifecycle()",
      "cleanup_expired_data()",
      "cleanup_old_heartbeats()",
      "enforce_chat_group_member_limit()",
      "enforce_member_defaults()",
      "handle_new_user()",
      "log_feature_flag_change()",
      "prevent_group_identity_change()",
      "prevent_group_member_identity_change()",
      "refresh_group_member_count()",
      "update_tip_confirmation_count()",
    ]) {
      expect(sql).toContain(
        `revoke execute on function public.${fn} from public, anon, authenticated`,
      );
    }
    expect(sql).not.toContain(
      "revoke execute on function public.get_display_names(uuid[]) from authenticated",
    );
  });

  it("runs atomically", () => {
    const sql = readFileSync(upPath, "utf8").toLowerCase();
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
  });
});
