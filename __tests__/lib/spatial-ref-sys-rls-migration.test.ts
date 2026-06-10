import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260610100000_spatial_ref_sys_rls_readonly.sql",
  ),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("20260610100000_spatial_ref_sys_rls_readonly migration", () => {
  it("dokumentiert den Supabase-Owner-Vorbehalt", () => {
    expect(SQL).toContain("supabase_admin");
    expect(SQL).toContain("owner-only rls-ddl");
    expect(SQL).toContain("garantierte schutz bleibt revoke all + grant select");
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
