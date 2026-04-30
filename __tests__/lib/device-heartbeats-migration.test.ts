import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_055 = readFileSync(
  join(process.cwd(), "supabase", "migrations", "055_device_heartbeats.sql"),
  "utf8",
);

describe("device heartbeats migration", () => {
  it("plant pg_cron nur wenn das cron-Schema existiert", () => {
    expect(MIGRATION_055).toContain("to_regnamespace('cron')");
    expect(MIGRATION_055).toContain("EXECUTE");
    expect(MIGRATION_055).not.toMatch(/^SELECT cron\.schedule\(/m);
  });
});
