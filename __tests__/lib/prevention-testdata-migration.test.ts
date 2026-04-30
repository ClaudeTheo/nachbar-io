import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_140 = readFileSync(
  join(process.cwd(), "supabase", "migrations", "140_prevention_testdata.sql"),
  "utf8",
);

describe("prevention testdata migration", () => {
  it("ueberspringt Testdaten wenn feste Seed-User lokal fehlen", () => {
    expect(MIGRATION_140).toContain("COUNT(*) FROM users");
    expect(MIGRATION_140).toContain("Praevention-Testdaten uebersprungen");
    expect(MIGRATION_140).toContain("RETURN;");
  });
});
