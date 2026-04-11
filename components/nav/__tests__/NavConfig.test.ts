// Tests für NavConfig — 4-Tab-Navigation pro Rolle
import { describe, it, expect } from "vitest";
import { getNavItems, type NavRole } from "../NavConfig";

describe("getNavItems", () => {
  it("gibt 4 Items für Senior zurück", () => {
    const items = getNavItems("senior");
    expect(items).toHaveLength(4);
    expect(items[0].label).toBe("Start");
    expect(items[0].href).toBe("/dashboard");
    expect(items[1].label).toBe("Quartier");
    // Task B-5: Drift-Aufloesung — /quartier-info ist der Gewinner.
    expect(items[1].href).toBe("/quartier-info");
    expect(items[2].label).toBe("Gesundheit");
    expect(items[2].href).toBe("/care");
    expect(items[3].label).toBe("Ich");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items für Helfer zurück", () => {
    const items = getNavItems("helper");
    expect(items).toHaveLength(4);
    expect(items[0].label).toBe("Übersicht");
    expect(items[1].href).toBe("/hilfe/tasks");
    expect(items[2].href).toBe("/hilfe/requests");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items für Angehörigen zurück", () => {
    const items = getNavItems("caregiver");
    expect(items).toHaveLength(4);
    expect(items[1].href).toBe("/care/status");
    expect(items[2].label).toBe("Gesundheit");
    expect(items[2].href).toBe("/care");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items für Org-Admin zurück", () => {
    const items = getNavItems("org_admin");
    expect(items).toHaveLength(4);
    // Task B-5: Drift-Aufloesung — /quartier-info ist der Gewinner.
    expect(items[1].href).toBe("/quartier-info");
    expect(items[2].label).toBe("Verwaltung");
    expect(items[2].href).toBe("/org");
    expect(items[3].href).toBe("/profile");
  });

  it("keine Rolle hat Notfall-Item in der Navigation", () => {
    const roles: NavRole[] = ["senior", "helper", "caregiver", "org_admin"];
    for (const role of roles) {
      const items = getNavItems(role);
      const hasEmergency = items.some((item) => item.href === "/alerts/new");
      expect(hasEmergency).toBe(false);
    }
  });

  it("default Rolle ist Senior", () => {
    const items = getNavItems("senior");
    expect(items[0].label).toBe("Start");
  });
});
