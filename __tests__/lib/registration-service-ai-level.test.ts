import { describe, it, expect, vi } from "vitest";
import { persistUserProfile } from "@/lib/services/registration.service";

function makeAdminDb() {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({
    upsert: upsertMock,
  }));
  return {
    upsertMock,
    db: {
      from: fromMock,
    } as never,
  };
}

const baseIdentity = {
  firstName: "Max",
  lastName: "Mustermann",
  dateOfBirth: "1977-04-25",
  displayName: "Max Mustermann",
};

describe("persistUserProfile — ai_assistance_level", () => {
  it.each([
    [undefined, "yes", "basic"],
    [undefined, "no", "off"],
    [undefined, "later", "later"],
    ["off", "no", "off"],
    ["basic", "yes", "basic"],
    ["everyday", "yes", "everyday"],
    ["later", "later", "later"],
  ] as const)(
    "schreibt fuer level=%s + choice=%s den ai_assistance_level=%s",
    async (level, choice, expectedLevel) => {
      const { db, upsertMock } = makeAdminDb();
      await persistUserProfile(
        db,
        "user-1",
        baseIdentity,
        "active",
        "invite_code",
        "resident",
        choice as "yes" | "no" | "later",
        level as
          | "off"
          | "basic"
          | "everyday"
          | "later"
          | undefined,
      );
      expect(upsertMock).toHaveBeenCalled();
      const written = upsertMock.mock.calls[0][0];
      expect(written.settings.ai_assistance_level).toBe(expectedLevel);
      expect(written.settings.ai_audit_log[0].assistance_level).toBe(
        expectedLevel,
      );
    },
  );
});
