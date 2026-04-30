import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_123 = readFileSync(
  join(process.cwd(), "supabase", "migrations", "123_speed_dial_favorites.sql"),
  "utf8",
);

describe("speed dial favorites migration", () => {
  it("referenziert die vorhandene users-Tabelle statt profiles", () => {
    expect(MIGRATION_123).toContain("REFERENCES users(id)");
    expect(MIGRATION_123).not.toContain("REFERENCES profiles(id)");
  });
});
