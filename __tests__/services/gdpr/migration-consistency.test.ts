// Static-Analyse: TS-Registry ↔ SQL-Migration-Konsistenz + Registry-Selbstkonsistenz.
// Ersatz für den (wegen Prod-Drift nicht möglichen) Supabase-Branch-Test.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  GDPR_DELETION_FKS,
  GDPR_EXPORT_TABLES,
  columnsToMakeNullable,
} from "@/lib/services/gdpr/user-data-registry";

// Die Lösch-Topologie ist auf drei Migrationen verteilt: 20260529140000 (care_*/memory/
// group/consent — CASCADE+SET NULL + RPC + Trigger), 20260530120000 (Aktor-/Bezugs-FKs
// außerhalb Profi-Vertical — SET NULL) und 20260531213000 (Civic/OZG/Prevention/Pflege-
// Profi Aktor-/Beleg-FKs Teil 3a — SET NULL). Alle drei zusammen spiegeln GDPR_DELETION_FKS.
const sql =
  readFileSync(
    join(process.cwd(), "supabase/migrations/20260529140000_gdpr_deletion_cascade.sql"),
    "utf8",
  ) +
  "\n" +
  readFileSync(
    join(process.cwd(), "supabase/migrations/20260530120000_gdpr_deletion_setnull_actors_part2.sql"),
    "utf8",
  ) +
  "\n" +
  readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260531213000_gdpr_deletion_setnull_civic_prevention_part3.sql",
    ),
    "utf8",
  );

// Folge-Migration: härtet die EXECUTE-Grants (anon/authenticated-Leak via Supabase
// default privileges, der durch REVOKE FROM PUBLIC allein NICHT geschlossen wird).
const sqlRevoke = readFileSync(
  join(process.cwd(), "supabase/migrations/20260529150000_gdpr_delete_user_revoke_anon.sql"),
  "utf8",
);

describe("GDPR-Migration ↔ Registry", () => {
  it("enthält für jeden Lösch-FK das passende VALUES-Tupel", () => {
    for (const fk of GDPR_DELETION_FKS) {
      const rule = fk.rule === "cascade" ? "CASCADE" : "SET NULL";
      const needle = `('${fk.table}','${fk.column}','${fk.schema}','${rule}')`;
      expect(sql, `FK ${fk.schema}.${fk.table}.${fk.column} fehlt in Migration`).toContain(
        needle,
      );
    }
  });

  it("macht jede NOT-NULL-Aktor-Spalte zuerst nullable (drift-toleranter DO-Block)", () => {
    for (const fk of columnsToMakeNullable()) {
      const needle = `('${fk.table}','${fk.column}')`;
      expect(sql, `${fk.table}.${fk.column} fehlt im nullable-Block`).toContain(needle);
    }
    expect(sql).toContain("DROP NOT NULL");
  });

  it("ist drift-tolerant (überspringt im lokalen Stack fehlende Prod-Tabellen)", () => {
    // Der CI-Smoke-Stack hat nicht alle Prod-Drift-Tabellen → to_regclass-Guard Pflicht
    expect(sql).toContain("to_regclass");
    expect(sql).toContain("CONTINUE");
  });

  it("definiert die RPC gdpr_delete_user nur für service_role", () => {
    expect(sql).toContain("FUNCTION public.gdpr_delete_user(target_user_id uuid)");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.gdpr_delete_user\(uuid\) TO service_role/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.gdpr_delete_user\(uuid\) FROM PUBLIC/);
  });

  it("entzieht anon und authenticated explizit EXECUTE (Supabase default-privileges-Leak)", () => {
    // REVOKE FROM PUBLIC allein reicht bei Supabase NICHT: ALTER DEFAULT PRIVILEGES vergibt
    // anon/authenticated explizite EXECUTE-Grants, die FROM PUBLIC nicht entfernt. Sonst
    // könnte jeder eingeloggte (oder via anon-Key sogar nicht-eingeloggte) Nutzer die
    // SECURITY-DEFINER-RPC aufrufen und beliebige Nutzer löschen (RLS-Bypass).
    expect(sqlRevoke).toMatch(/REVOKE EXECUTE ON FUNCTION public\.gdpr_delete_user\(uuid\) FROM anon/);
    expect(sqlRevoke).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.gdpr_delete_user\(uuid\) FROM authenticated/,
    );
  });

  it("macht den care_audit_log-Trigger GDPR-fähig (GUC-Gate, kein Blanko-Bypass)", () => {
    expect(sql).toContain("app.gdpr_delete");
    expect(sql).toContain("prevent_audit_modification");
    // Der Schutz bleibt für normale Pfade bestehen
    expect(sql).toContain("RAISE EXCEPTION");
  });
});

describe("GDPR-Registry-Selbstkonsistenz", () => {
  it("führt jede sensible Art.9-Care-Tabelle im Export", () => {
    const exportTables = GDPR_EXPORT_TABLES.map((t) => t.table);
    for (const t of ["care_profiles", "care_medications", "care_checkins", "care_sos_alerts"]) {
      expect(exportTables).toContain(t);
    }
  });

  it("löscht jede sensible Art.9-Care-Tabelle per CASCADE", () => {
    const cascadeTables = GDPR_DELETION_FKS.filter((f) => f.rule === "cascade").map((f) => f.table);
    for (const t of ["care_checkins", "care_medications", "care_sos_alerts", "care_profiles_hilfe"]) {
      expect(cascadeTables).toContain(t);
    }
  });

  it("hat keine doppelten FK-Einträge (schema.table.column eindeutig)", () => {
    const keys = GDPR_DELETION_FKS.map((f) => `${f.schema}.${f.table}.${f.column}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("markiert mindestens die Kern-Gesundheitstabellen als Art. 9", () => {
    const art9 = GDPR_EXPORT_TABLES.filter((t) => t.art9).map((t) => t.table);
    expect(art9).toContain("care_profiles");
    expect(art9).toContain("care_medications");
    expect(art9.length).toBeGreaterThanOrEqual(5);
  });
});
