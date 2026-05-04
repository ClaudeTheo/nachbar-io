import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "187_emergency_pdf_token_hash.sql",
  ),
  "utf8",
);
const ROLLBACK = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "rollbacks",
    "187_emergency_pdf_token_hash.down.sql",
  ),
  "utf8",
);
const SQL = MIGRATION.toLowerCase();
const DOWN_SQL = ROLLBACK.toLowerCase();

describe("187_emergency_pdf_token_hash migration", () => {
  it("bleibt bei fehlender emergency_profiles Drift-Tabelle replay-tauglich", () => {
    expect(SQL).toContain("to_regclass('public.emergency_profiles')");
    expect(SQL).toContain("return;");
    expect(SQL).toContain("raise notice");
  });

  it("speichert PDF-Token als Hash und leert Legacy-Klartext", () => {
    expect(SQL).toContain("create extension if not exists pgcrypto");
    expect(SQL).toContain("pdf_token_hash text");
    expect(SQL).toContain("digest(pdf_token, ''sha256'')");
    expect(SQL).toContain("set pdf_token = null");
  });

  it("schuetzt auch den Rollback bei fehlender Drift-Tabelle", () => {
    expect(DOWN_SQL).toContain("to_regclass('public.emergency_profiles')");
    expect(DOWN_SQL).toContain("return;");
  });
});
