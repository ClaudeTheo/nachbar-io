import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Statische Migrations-Analyse (Pattern wie auto-answer-senior-consent-migration.test.ts).
// Haertung CL-1 / AA-RLS-1 (task_796f821c): die einzige UPDATE-Policy auf caregiver_links
// ("caregiver_links_update_resident", Mig 071:50) ist SPALTENLOS — ein Resident kann damit
// JEDE Spalte seiner Links setzen, inkl. der Grant-Spalten consent_status / profile_edit_allowed
// / sensitive_data_allowed (Mig 197:119-123). sensitive_data_allowed gated direkt sensible
// Care-Daten -> Privilege-Escalation per Self-Update. Ein BEFORE-UPDATE-Trigger macht genau
// diese drei Spalten fuer jeden Nicht-service_role-UPDATE unveraenderlich.
const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260618130000_caregiver_links_grant_update_restrictions.sql",
);
const RAW = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, "utf8") : "";
// Kommentarzeilen (--) entfernen, damit erklaerende Texte die Assertions nicht verfaelschen.
const SQL = RAW.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .toLowerCase();

describe("20260618130000_caregiver_links_grant_update_restrictions migration", () => {
  it("existiert", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  it("laeuft als atomare Transaktion", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
  });

  it("macht die drei Consent-Grant-Spalten per BEFORE-UPDATE-Trigger sticky (ausser service_role)", () => {
    expect(SQL).toContain(
      "create or replace function enforce_caregiver_links_update_restrictions",
    );
    // service_role-Erkennung nach juengstem Audit-Standard (Mig 198 / Befund CL-2).
    expect(SQL).toContain("current_setting('role', true)");
    expect(SQL).toContain("'service_role'");
    // Nicht-service_role: die drei Grant-Spalten werden auf den Alt-Wert zurueckgesetzt.
    expect(SQL).toContain("new.consent_status := old.consent_status");
    expect(SQL).toContain(
      "new.profile_edit_allowed := old.profile_edit_allowed",
    );
    expect(SQL).toContain(
      "new.sensitive_data_allowed := old.sensitive_data_allowed",
    );
    expect(SQL).toContain("before update on caregiver_links");
    expect(SQL).toContain(
      "execute function enforce_caregiver_links_update_restrictions",
    );
  });

  it("bleibt schmal — laesst Auto-Answer-, Revoke- und Heartbeat-Schreibpfade frei", () => {
    // auto_answer_*-Spalten (Angehoerigen-RLS-Schreibpfad updateAutoAnswerSettings) NICHT sticky.
    expect(SQL).not.toContain("new.auto_answer_allowed");
    expect(SQL).not.toContain("new.auto_answer_start");
    expect(SQL).not.toContain("new.auto_answer_end");
    // revoked_at / heartbeat_visible (Resident-Self-Service, Mig 071) bleiben frei.
    expect(SQL).not.toContain("new.revoked_at");
    expect(SQL).not.toContain("new.heartbeat_visible");
  });

  it("tastet bestehende Schutz-Trigger und die resident-Policy nicht an", () => {
    // Die vorbestehenden Schutz-Trigger (Mig 142 plus_trial_end, AA auto_answer_consent) bleiben.
    expect(SQL).not.toContain("drop trigger if exists protect_plus_trial_end");
    expect(SQL).not.toContain(
      "drop trigger if exists protect_auto_answer_senior_consent",
    );
    // Trigger-Ansatz statt Policy-Rewrite: die spaltenlose Policy wird NICHT veraendert.
    expect(SQL).not.toContain("create policy");
    expect(SQL).not.toContain("drop policy");
  });
});
