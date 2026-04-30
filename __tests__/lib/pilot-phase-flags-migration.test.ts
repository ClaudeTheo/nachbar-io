import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "177_pilot_phase_flags.sql"),
  "utf8",
);

describe("177_pilot_phase_flags migration", () => {
  it.each([
    "BILLING_ENABLED",
    "TWILIO_ENABLED",
    "CHECKIN_MESSAGES_ENABLED",
  ])("legt %s default-off an", (flag) => {
    expect(MIGRATION).toContain(flag);
    expect(MIGRATION).toContain("false");
  });

  it("ist bei erneutem Apply idempotent", () => {
    expect(MIGRATION).toContain("on conflict (key) do nothing");
  });
});
