import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_200 = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "200_advisor_hardening_paket_a.sql",
  ),
  "utf8",
);

describe("advisor hardening Paket A migration", () => {
  it("ueberspringt die Policy-Haertung wenn die Drift-Tabelle lokal fehlt", () => {
    expect(MIGRATION_200).toContain("to_regclass('public.claude_messages')");
    expect(MIGRATION_200).toContain("EXECUTE");
    expect(MIGRATION_200).not.toMatch(
      /^DROP POLICY IF EXISTS claude_messages_anon/m,
    );
  });
});
