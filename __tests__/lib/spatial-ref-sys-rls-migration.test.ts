import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260610193356_spatial_ref_sys_rls_readonly.sql",
);
const OLD_MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260610100000_spatial_ref_sys_rls_readonly.sql",
);
const MIGRATION = readFileSync(
  MIGRATION_PATH,
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("20260610193356_spatial_ref_sys_rls_readonly migration", () => {
  it("nutzt die in Prod markierte MCP-Apply-Version statt der alten lokalen Version", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    expect(existsSync(OLD_MIGRATION_PATH)).toBe(false);
    expect(SQL).toContain("migration 20260610193356");
    expect(SQL).toContain("migration-history-version ist 20260610193356");
  });

  it("dokumentiert den Supabase-Support-Fix und den Owner-Vorbehalt", () => {
    expect(SQL).toContain("su-393741");
    expect(SQL).toContain("postgis-extension serverseitig von public nach extensions");
    expect(SQL).toContain("prod enthaelt deshalb keine public.spatial_ref_sys mehr");
    expect(SQL).toContain("supabase_admin");
    expect(SQL).toContain("owner-only rls-ddl");
    expect(SQL).toContain(
      "garantierte schutz fuer local/alt-setups bleibt revoke all + grant select",
    );
    expect(SQL).toContain("versucht bewusst nicht, postgis selbst nach extensions zu verschieben");
  });

  it("schuetzt alle public.spatial_ref_sys-Zugriffe hinter einem Existenz-Guard", () => {
    const guardIndex = SQL.indexOf(
      "if to_regclass('public.spatial_ref_sys') is null then",
    );
    const returnIndex = SQL.indexOf("return;", guardIndex);
    const revokeIndex = SQL.indexOf(
      "revoke all on table public.spatial_ref_sys from anon, authenticated",
    );
    const grantIndex = SQL.indexOf(
      "grant select on table public.spatial_ref_sys to anon, authenticated",
    );
    const rlsIndex = SQL.indexOf(
      "alter table public.spatial_ref_sys enable row level security",
    );

    expect(guardIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardIndex);
    expect(revokeIndex).toBeGreaterThan(returnIndex);
    expect(grantIndex).toBeGreaterThan(returnIndex);
    expect(rlsIndex).toBeGreaterThan(returnIndex);
    expect(SQL).toContain("legacy-hardening wird uebersprungen");
  });

  it("meldet, wenn supabase_admin-GRANTs per postgres nicht entfernt wurden", () => {
    expect(SQL).toContain("has_table_privilege");
    expect(SQL).toContain("revoke konnte supabase_admin-grants nicht entfernen");
    expect(SQL).toContain("owner-level-fix erforderlich");
  });

  it("kapselt RLS-DDL in einem insufficient_privilege-sicheren DO-Block", () => {
    expect(SQL).toContain("do $$");
    expect(SQL).toContain(
      "alter table public.spatial_ref_sys enable row level security",
    );
    expect(SQL).toContain("exception when insufficient_privilege then");
    expect(SQL).toContain("raise notice");
    expect(SQL).toContain(
      "revoke/grant bleibt der wirksame schutz",
    );
  });

  it("macht Browser-Rollen read-only statt schreibend", () => {
    expect(SQL).toContain(
      "revoke all on table public.spatial_ref_sys from anon, authenticated",
    );
    expect(SQL).toContain(
      "grant select on table public.spatial_ref_sys to anon, authenticated",
    );
  });

  it("erstellt nur eine SELECT-Policy fuer SRID-Referenzdaten", () => {
    expect(SQL).toContain("create policy spatial_ref_sys_read_reference_data");
    expect(SQL).toContain("drop policy if exists spatial_ref_sys_read_reference_data");
    expect(SQL).toContain("comment on policy spatial_ref_sys_read_reference_data");
    expect(SQL).toContain("for select");
    expect(SQL).toContain("to anon, authenticated");
    expect(SQL).toContain("using (true)");
    expect(SQL).not.toContain("for insert");
    expect(SQL).not.toContain("for update");
    expect(SQL).not.toContain("for delete");
  });

  it("verschiebt oder entfernt die PostGIS-Extension nicht", () => {
    expect(SQL).not.toContain("drop extension");
    expect(SQL).not.toContain("alter extension postgis");
  });
});
