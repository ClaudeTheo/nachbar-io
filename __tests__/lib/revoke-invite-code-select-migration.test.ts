import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Statische Migrations-Analyse (Pattern wie quarter-isolate-stammdaten-rls-migration.test.ts).
// Verifiziert den Spaltenschutz fuer households.invite_code: beide SELECT-Wege
// (table-weit + column-explizit) werden fuer anon/authenticated entzogen, alle uebrigen
// Spalten zurueckgegeben, invite_code NICHT.
const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260530160000_revoke_invite_code_select.sql",
  ),
  "utf8",
);
// Nur die echten SQL-Statements pruefen — Kommentarzeilen (--) erwaehnen
// service_role und "GRANT SELECT (<spalte>)" legitim und wuerden sonst die
// Assertions verfaelschen.
const SQL = MIGRATION.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .toLowerCase();

// Prod-Stand 2026-05-30: 21 households-Spalten, 20 erlaubt (alle ausser invite_code).
const ALLOWED_COLUMNS = [
  "id",
  "street_name",
  "house_number",
  "lat",
  "lng",
  "verified",
  "created_at",
  "quarter_id",
  "map_house_id",
  "quiet_hours_enabled",
  "quiet_hours_start",
  "quiet_hours_end",
  "postal_code",
  "city",
  "position_source",
  "position_accuracy",
  "position_verified",
  "position_verified_at",
  "position_manual_override",
  "position_raw_payload",
];

describe("20260530160000_revoke_invite_code_select migration", () => {
  it("entzieht den table-weiten SELECT fuer anon und authenticated", () => {
    expect(SQL).toContain("revoke select on public.households from anon, authenticated");
  });

  it("entzieht zusaetzlich den expliziten column-level SELECT auf invite_code", () => {
    // Supabase-Default legt neben dem table-Grant einen column-Grant an —
    // beide muessen weg, sonst greift einer weiter.
    expect(SQL).toContain(
      "revoke select (invite_code) on public.households from anon, authenticated",
    );
  });

  it("gibt SELECT auf alle uebrigen Spalten zurueck — ohne invite_code", () => {
    expect(SQL).toContain("grant select (");
    expect(SQL).toContain(") on public.households to authenticated, anon");
    for (const col of ALLOWED_COLUMNS) {
      // jede erlaubte Spalte muss im GRANT stehen, sonst bricht ein Browser-Lesepfad
      expect(SQL).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it("nimmt invite_code NICHT in den GRANT auf", () => {
    // invite_code darf nur in den REVOKE-Zeilen vorkommen, nie im GRANT.
    const grantSection = SQL.slice(SQL.indexOf("grant select ("));
    expect(grantSection).not.toContain("invite_code");
  });

  it("laesst service_role unangetastet (liest invite_code weiter)", () => {
    expect(SQL).not.toContain("service_role");
  });

  it("laeuft als atomare Transaktion", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
  });
});
