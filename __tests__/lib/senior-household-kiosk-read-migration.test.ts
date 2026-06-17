import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Statische Migrations-Analyse (Pattern wie revoke-invite-code-select-migration.test.ts).
// Welle SB-1: verifizierte Haushaltsmitglieder duerfen Fotos/Zettel ihres eigenen
// Haushalts SELECTen (bisher nur Caregiver via caregiver_links + Uploader/Ersteller,
// Mig 083). Reine Lese-Erweiterung — keine Schreibrechte, kein Eingriff in die
// bestehenden 083-Policies oder service_role.
const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260617120000_senior_household_kiosk_read.sql",
);
const RAW = readFileSync(MIGRATION_PATH, "utf8");
// Kommentarzeilen (--) entfernen, damit erklaerende Texte die Assertions nicht verfaelschen.
const SQL = RAW.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .toLowerCase();

describe("20260617120000_senior_household_kiosk_read migration", () => {
  it("existiert", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  it("laeuft als atomare Transaktion", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
  });

  it("ergaenzt eine idempotente SELECT-Policy auf kiosk_photos (nur sichtbare Fotos)", () => {
    expect(SQL).toContain(
      "drop policy if exists kiosk_photos_select_household_member on kiosk_photos",
    );
    expect(SQL).toContain(
      "create policy kiosk_photos_select_household_member on kiosk_photos",
    );
    expect(SQL).toContain("visible = true");
  });

  it("ergaenzt eine idempotente SELECT-Policy auf kiosk_reminders", () => {
    expect(SQL).toContain(
      "drop policy if exists kiosk_reminders_select_household_member on kiosk_reminders",
    );
    expect(SQL).toContain(
      "create policy kiosk_reminders_select_household_member on kiosk_reminders",
    );
  });

  it("scopt beide Policies ueber verifizierte household_members und auth.uid()", () => {
    const scope =
      /from household_members hm\s+where hm\.user_id = auth\.uid\(\) and hm\.verified_at is not null/g;
    const matches = SQL.match(scope);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });

  it("oeffnet ausschliesslich Lesezugriff — kein INSERT/UPDATE/DELETE", () => {
    expect(SQL).toContain("for select");
    expect(SQL).not.toContain("for insert");
    expect(SQL).not.toContain("for update");
    expect(SQL).not.toContain("for delete");
  });

  it("laesst die bestehenden 083-Policies und service_role unangetastet", () => {
    expect(SQL).not.toContain("drop policy if exists kiosk_photos_select on");
    expect(SQL).not.toContain("drop policy if exists kiosk_reminders_select on");
    expect(SQL).not.toContain("service_role");
  });
});
