// Tests für NavConfig — Rollen-basierte Navigation
import { describe, it, expect } from "vitest";
import { getNavItems, type NavRole } from "../NavConfig";

describe("getNavItems", () => {
  it("gibt 5 Items für Senior zurück", () => {
    const items = getNavItems("senior");
    expect(items).toHaveLength(5);
    expect(items[0].label).toBe("Zuhause");
    expect(items[1].isEmergency).toBe(true);
    expect(items[2].href).toBe("/my-day");
    expect(items[4].href).toBe("/profile");
  });

  it("gibt 5 Items für Helfer zurück", () => {
    const items = getNavItems("helper");
    expect(items).toHaveLength(5);
    expect(items[0].label).toBe("Übersicht");
    expect(items[2].href).toBe("/hilfe/tasks");
    expect(items[3].href).toBe("/hilfe/requests");
  });

  it("gibt 5 Items für Angehörigen zurück", () => {
    const items = getNavItems("caregiver");
    expect(items).toHaveLength(5);
    expect(items[2].href).toBe("/care/status");
    expect(items[3].href).toBe("/care/contact");
  });

  it("gibt 5 Items für Org-Admin zurück", () => {
    const items = getNavItems("org_admin");
    expect(items).toHaveLength(5);
    expect(items[3].href).toBe("/notifications");
  });

  it("jede Rolle hat Notfall als zweites Item", () => {
    const roles: NavRole[] = ["senior", "helper", "caregiver", "org_admin"];
    for (const role of roles) {
      const items = getNavItems(role);
      expect(items[1].href).toBe("/alerts/new");
      expect(items[1].isEmergency).toBe(true);
    }
  });
});
