import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "186_carecircle_rls_bridge.sql"),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();

describe("186_carecircle_rls_bridge migration", () => {
  it("erweitert is_care_helper_for um aktive caregiver_links", () => {
    expect(SQL).toContain("create or replace function public.is_care_helper_for");
    expect(SQL).toContain("public.caregiver_links");
    expect(SQL).toContain("caregiver_id = auth.uid()");
    expect(SQL).toContain("resident_id = p_senior_id");
    expect(SQL).toContain("revoked_at is null");
  });

  it("mappt caregiver_links Rollen konsistent zur App-Berechtigung", () => {
    expect(SQL).toContain("create or replace function public.care_helper_role");
    expect(SQL).toContain("relationship_type = 'volunteer'");
    expect(SQL).toContain("then 'neighbor'");
    expect(SQL).toContain("else 'relative'");
  });

  it("bleibt bei fehlenden Tabellen fail-closed und replay-tauglich", () => {
    expect(SQL).toContain("to_regclass('public.care_helpers')");
    expect(SQL).toContain("to_regclass('public.caregiver_links')");
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("stable");
  });
});
