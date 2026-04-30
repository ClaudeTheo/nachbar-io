import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_078 = readFileSync(
  join(process.cwd(), "supabase", "migrations", "078_fix_video_credits_rls.sql"),
  "utf8",
);

describe("video credits RLS repair migration", () => {
  it("ueberspringt Policy-Reparaturen wenn die Tabellen lokal noch fehlen", () => {
    expect(MIGRATION_078).toContain("to_regclass('public.video_credits')");
    expect(MIGRATION_078).toContain("to_regclass('public.video_credit_usage')");
    expect(MIGRATION_078).toContain("EXECUTE");
    expect(MIGRATION_078).not.toMatch(/^DROP POLICY/m);
    expect(MIGRATION_078).not.toMatch(/^CREATE POLICY/m);
  });
});
