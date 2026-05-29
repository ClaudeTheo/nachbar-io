import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Statische Migrations-Analyse (Pattern wie group-members-rls-migration.test.ts).
// Verifiziert die Quartier-Isolation der Stammdaten households/users/map_houses.
// invite_code-Schutz ist BEWUSST nicht Teil dieser Welle (Founder-Go 2026-05-29: Split).
const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260529120000_quarter_isolate_stammdaten.sql",
  ),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("20260529120000_quarter_isolate_stammdaten migration", () => {
  it("definiert Security-Definer-Helper gegen RLS-Rekursion mit gesetztem search_path", () => {
    expect(SQL).toContain(
      "create or replace function public.is_same_quarter_user",
    );
    expect(SQL).toContain(
      "create or replace function public.is_household_in_my_quarter",
    );
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("set search_path = public, pg_temp");
  });

  it("entzieht PUBLIC die Helper und erlaubt nur authenticated die Ausfuehrung", () => {
    expect(SQL).toContain(
      "revoke all on function public.is_same_quarter_user(uuid) from public",
    );
    expect(SQL).toContain(
      "grant execute on function public.is_same_quarter_user(uuid) to authenticated",
    );
    expect(SQL).toContain(
      "revoke all on function public.is_household_in_my_quarter(uuid) from public",
    );
    expect(SQL).toContain(
      "grant execute on function public.is_household_in_my_quarter(uuid) to authenticated",
    );
  });

  it("isoliert households direkt ueber quarter_id und entfernt die breiten Auth-Policies", () => {
    expect(SQL).toContain(
      'drop policy if exists "households_read_authenticated" on public.households',
    );
    expect(SQL).toContain(
      'drop policy if exists "households_read" on public.households',
    );
    expect(SQL).toContain(
      "create policy households_quarter_select on public.households",
    );
    expect(SQL).toContain("quarter_id = public.get_user_quarter_id()");
    expect(SQL).toContain("public.is_super_admin()");
    expect(SQL).toContain("public.is_quarter_admin_for(quarter_id)");
  });

  it("isoliert users ueber den Quartier-Helper und behaelt die Eigen-Zeile sichtbar", () => {
    expect(SQL).toContain(
      'drop policy if exists "users_read_verified" on public.users',
    );
    expect(SQL).toContain(
      "create policy users_quarter_select on public.users",
    );
    expect(SQL).toContain("id = auth.uid()");
    expect(SQL).toContain("public.is_same_quarter_user(id)");
    // users_read_own (eigene Zeile) bleibt unangetastet — wird NICHT gedroppt
    expect(SQL).not.toContain('drop policy if exists "users_read_own"');
  });

  it("isoliert map_houses ueber den Haushalt und laesst freie Pins ohne household_id zu", () => {
    expect(SQL).toContain(
      'drop policy if exists "map_houses_read" on public.map_houses',
    );
    expect(SQL).toContain(
      "create policy map_houses_quarter_select on public.map_houses",
    );
    expect(SQL).toContain("household_id is null");
    expect(SQL).toContain("public.is_household_in_my_quarter(household_id)");
  });

  it("fasst den invite_code-Spaltenschutz NICHT an (separate Folge-Welle)", () => {
    expect(SQL).not.toContain("revoke select (invite_code)");
    expect(SQL).not.toContain("revoke select(invite_code)");
  });

  it("laeuft als atomare Transaktion", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
  });
});
