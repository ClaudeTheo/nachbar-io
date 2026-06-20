import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Statische Migrations-Analyse (Pattern wie senior-household-kiosk-read-migration.test.ts).
// Welle AA-1: Auto-Annahme von Anrufen braucht BEIDE Seiten — der Angehoerige erlaubt sie
// (Mig 084, auto_answer_allowed/_start/_end) UND der Senior willigt ausdruecklich ein (neu).
// NULL = keine Einwilligung. Schmaler Sticky-Trigger schuetzt NUR die neue Spalte, sodass die
// Einwilligung ausschliesslich ueber die auditierte service_role-Route gesetzt werden kann.
const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260618120000_auto_answer_senior_consent.sql",
);
const RAW = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, "utf8") : "";
// Kommentarzeilen (--) entfernen, damit erklaerende Texte die Assertions nicht verfaelschen.
const SQL = RAW.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .toLowerCase();

describe("20260618120000_auto_answer_senior_consent migration", () => {
  it("existiert", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  it("laeuft als atomare Transaktion", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
  });

  it("ergaenzt eine idempotente, NULLABLE timestamptz-Spalte auf caregiver_links", () => {
    expect(SQL).toContain("alter table caregiver_links");
    expect(SQL).toContain(
      "add column if not exists auto_answer_senior_consented_at timestamptz",
    );
    // Nullable: NULL = keine Einwilligung. Darf NICHT NOT NULL sein.
    expect(SQL).not.toContain(
      "auto_answer_senior_consented_at timestamptz not null",
    );
  });

  it("setzt einen abgrenzenden Spalten-Kommentar", () => {
    expect(SQL).toContain(
      "comment on column caregiver_links.auto_answer_senior_consented_at is",
    );
  });

  it("schuetzt die neue Spalte per BEFORE-UPDATE-Trigger (sticky ausser service_role)", () => {
    expect(SQL).toContain(
      "create or replace function protect_auto_answer_senior_consent",
    );
    // service_role-Erkennung nach juengstem Audit-Standard (Mig 198).
    expect(SQL).toContain("current_setting('role', true)");
    expect(SQL).toContain("'service_role'");
    // Nicht-service_role: Spalte wird auf den Alt-Wert zurueckgesetzt.
    expect(SQL).toContain(
      "new.auto_answer_senior_consented_at := old.auto_answer_senior_consented_at",
    );
    expect(SQL).toContain("before update on caregiver_links");
    expect(SQL).toContain(
      "execute function protect_auto_answer_senior_consent",
    );
  });

  it("bleibt schmal — fasst weder den 142-Trigger noch die Consent-Grant-Spalten an", () => {
    // Der vorbestehende Schutz-Trigger bleibt unangetastet.
    expect(SQL).not.toContain("drop trigger if exists protect_plus_trial_end");
    // CL-1-Haertung (consent_status/sensitive_data_allowed/profile_edit_allowed)
    // ist ein SEPARATER Task (task_796f821c), nicht Teil von AA.
    expect(SQL).not.toContain("sensitive_data_allowed");
    expect(SQL).not.toContain("profile_edit_allowed");
    // Die resident-UPDATE-Policy wird nicht veraendert.
    expect(SQL).not.toContain("caregiver_links_update_resident");
  });
});
