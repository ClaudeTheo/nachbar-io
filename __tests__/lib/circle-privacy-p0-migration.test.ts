import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

function readSql(...segments: string[]): string {
  const file = join(process.cwd(), ...segments);
  return existsSync(file) ? readFileSync(file, "utf8").toLowerCase() : "";
}

const SQL = readSql(
  "supabase",
  "migrations",
  "203_circle_privacy_p0.sql",
);
const ROLLBACK = readSql(
  "supabase",
  "rollbacks",
  "203_circle_privacy_p0.down.sql",
);

describe("203_circle_privacy_p0 migration", () => {
  it("macht vacation_modes owner-only und entfernt die breite Lesepolicy", () => {
    expect(SQL).toContain(
      'drop policy if exists "vacation_read" on public.vacation_modes',
    );
    expect(SQL).toContain(
      "create policy vacation_owner_select on public.vacation_modes",
    );
    expect(SQL).toMatch(/for select\s+to authenticated\s+using \(\s*user_id = \(select auth\.uid\(\)\)\s*\)/);
  });

  it("setzt neue und vorhandene Freigaben privacy-first auf false", () => {
    expect(SQL).toContain(
      "alter column notify_neighbors set default false",
    );
    expect(SQL).toMatch(
      /update public\.vacation_modes\s+set notify_neighbors = false\s+where notify_neighbors is distinct from false/,
    );
  });

  it("begrenzt household_members auf die eigene Zeile oder den eigenen verifizierten Haushalt", () => {
    expect(SQL).toContain(
      'drop policy if exists "hm_read" on public.household_members',
    );
    expect(SQL).toMatch(
      /create policy household_members_own_household_select\s+on public\.household_members/,
    );
    expect(SQL).toContain("user_id = (select auth.uid())");
    expect(SQL).toContain("public.is_my_verified_household(household_id)");
    expect(SQL).not.toContain("public.is_household_in_my_quarter(household_id)");
  });

  it("haertet den rekursionsfreien Helper", () => {
    expect(SQL).toContain(
      "create or replace function public.is_my_verified_household",
    );
    expect(SQL).toContain("stable");
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("set search_path = public, pg_temp");
    expect(SQL).toContain(
      "revoke all on function public.is_my_verified_household(uuid) from public",
    );
    expect(SQL).toContain(
      "revoke all on function public.is_my_verified_household(uuid) from anon",
    );
    expect(SQL).toContain(
      "grant execute on function public.is_my_verified_household(uuid) to authenticated",
    );
  });

  it("liefert einen atomaren, privacy-sicheren Rollback", () => {
    expect(ROLLBACK).toContain("begin;");
    expect(ROLLBACK).toContain("commit;");
    expect(ROLLBACK).toContain(
      "create policy \"hm_read\" on public.household_members",
    );
    expect(ROLLBACK).toContain(
      "create policy vacation_read on public.vacation_modes",
    );
    expect(ROLLBACK).toContain(
      "alter column notify_neighbors set default true",
    );
    expect(ROLLBACK).not.toMatch(
      /update public\.vacation_modes\s+set notify_neighbors = true/,
    );
  });

  it("laeuft als atomare Transaktion", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
  });
});
