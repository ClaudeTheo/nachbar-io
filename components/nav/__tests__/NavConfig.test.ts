// Tests fuer NavConfig — Rollen-basierte Navigation
import { describe, it, expect } from "vitest";
import { getNavItems, type NavRole } from "../NavConfig";

describe("getNavItems", () => {
  it("gibt 5 Items fuer Senior zurueck", () => {
    const items = getNavItems("senior");
    expect(items).toHaveLength(5);
    expect(items[0].label).toBe("Zuhause");
    expect(items[1].isEmergency).toBe(true);
    expect(items[2].href).toBe("/my-day");
    expect(items[4].href).toBe("/profile");
  });

  it("gibt 5 Items fuer Helfer zurueck", () => {
    const items = getNavItems("helper");
    expect(items).toHaveLength(5);
    expect(items[0].label).toBe("Uebersicht");
    expect(items[2].href).toBe("/hilfe/tasks");
    expect(items[3].href).toBe("/hilfe/requests");
  });

  it("gibt 5 Items fuer Angehoerigen zurueck", () => {
    const items = getNavItems("caregiver");
    expect(items).toHaveLength(5);
    expect(items[2].href).toBe("/care/status");
    expect(items[3].href).toBe("/care/contact");
  });

  it("gibt 5 Items fuer Org-Admin zurueck", () => {
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
