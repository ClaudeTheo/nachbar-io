// Welle G — Vitest-Mock-Builder fuer Test-User mit Pflicht-is_test_user=true.

import { describe, expect, it } from "vitest";

import { buildTestUser } from "@/__tests__/_helpers/test-user-builder";

describe("buildTestUser (Vitest-Mock-Builder)", () => {
  it("setzt is_test_user=true im Settings-Default", () => {
    const user = buildTestUser();
    expect(user.settings.is_test_user).toBe(true);
  });

  it("uebernimmt extraSettings, erzwingt aber is_test_user=true", () => {
    const user = buildTestUser({
      settings: { onboarding_completed: true, custom: "x" },
    });
    expect(user.settings.is_test_user).toBe(true);
    expect(user.settings.onboarding_completed).toBe(true);
    expect(user.settings.custom).toBe("x");
  });

  it("zwingt is_test_user=true auch wenn override versucht false zu setzen", () => {
    const user = buildTestUser({ settings: { is_test_user: false } });
    expect(user.settings.is_test_user).toBe(true);
  });

  it("hat sinnvolle Defaults (id, email, display_name, role, ui_mode, trust_level)", () => {
    const user = buildTestUser();
    expect(typeof user.id).toBe("string");
    expect(user.id.length).toBeGreaterThan(0);
    expect(user.email).toMatch(/@/);
    expect(user.email).toMatch(/nachbar/);
    expect(typeof user.display_name).toBe("string");
    expect(user.display_name).toMatch(/E2E/);
    expect(user.role).toBe("resident");
    expect(user.ui_mode).toBe("active");
    expect(user.trust_level).toBe("verified");
    expect(user.is_admin).toBe(false);
  });

  it("erlaubt Overrides fuer id, email, displayName, role, uiMode, trustLevel, isAdmin", () => {
    const user = buildTestUser({
      id: "custom-id",
      email: "a@b.local",
      displayName: "Petra",
      role: "caregiver",
      uiMode: "senior",
      trustLevel: "new",
      isAdmin: true,
    });
    expect(user.id).toBe("custom-id");
    expect(user.email).toBe("a@b.local");
    expect(user.display_name).toBe("Petra");
    expect(user.role).toBe("caregiver");
    expect(user.ui_mode).toBe("senior");
    expect(user.trust_level).toBe("new");
    expect(user.is_admin).toBe(true);
  });

  it("setzt test_user_kind in settings, wenn testKind angegeben", () => {
    const user = buildTestUser({ testKind: "e2e_pilot" });
    expect(user.settings.is_test_user).toBe(true);
    expect(user.settings.test_user_kind).toBe("e2e_pilot");
  });

  it("erstellt unique IDs bei mehreren Aufrufen ohne Override", () => {
    const a = buildTestUser();
    const b = buildTestUser();
    expect(a.id).not.toBe(b.id);
    expect(a.email).not.toBe(b.email);
  });
});
