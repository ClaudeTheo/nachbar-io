// Tests fuer NavConfig: 4-Tab-Navigation pro Rolle.
import { describe, expect, it } from "vitest";
import { getNavItems, type NavRole } from "../NavConfig";

describe("getNavItems", () => {
  it("gibt 4 Items fuer Aktiv 55+ mit ruhigem Quartier-Label zurueck", () => {
    const items = getNavItems("senior", { uiMode: "comfort" });
    expect(items).toHaveLength(4);
    expect(items[0].label).toBe("Start");
    expect(items[0].href).toBe("/dashboard");
    expect(items[1].label).toBe("Mein Quartier");
    expect(items[1].href).toBe("/quartier");
    expect(items[2].label).toBe("Mein Tag");
    expect(items[2].href).toBe("/my-day");
    expect(items[3].label).toBe("Ich");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items fuer Erwachsene mit kurzem Quartier-Label zurueck", () => {
    const items = getNavItems("senior", { uiMode: "active" });
    expect(items).toHaveLength(4);
    expect(items[0].label).toBe("Start");
    expect(items[0].href).toBe("/dashboard");
    expect(items[1].label).toBe("Quartier");
    expect(items[1].href).toBe("/quartier");
    expect(items[2].label).toBe("Mein Tag");
    expect(items[2].href).toBe("/my-day");
    expect(items[3].label).toBe("Ich");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt ohne ui_mode weiterhin die ruhige Default-Navigation zurueck", () => {
    const items = getNavItems("senior");
    expect(items).toHaveLength(4);
    expect(items[0].label).toBe("Start");
    expect(items[0].href).toBe("/dashboard");
    expect(items[1].label).toBe("Mein Quartier");
    expect(items[1].href).toBe("/quartier");
    expect(items[2].label).toBe("Mein Tag");
    expect(items[2].href).toBe("/my-day");
    expect(items[3].label).toBe("Ich");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items fuer Helfer zurueck", () => {
    const items = getNavItems("helper");
    expect(items).toHaveLength(4);
    expect(items[0].href).toBe("/dashboard");
    expect(items[1].href).toBe("/hilfe/tasks");
    expect(items[2].href).toBe("/hilfe/requests");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items fuer Angehoerige zurueck", () => {
    const items = getNavItems("caregiver");
    expect(items).toHaveLength(4);
    expect(items[1].href).toBe("/care/status");
    expect(items[2].label).toBe("Mein Tag");
    expect(items[2].href).toBe("/my-day");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items fuer Org-Admin zurueck", () => {
    const items = getNavItems("org_admin");
    expect(items).toHaveLength(4);
    expect(items[1].href).toBe("/quartier");
    expect(items[1].label).toBe("Mein Quartier");
    expect(items[2].label).toBe("Verwaltung");
    expect(items[2].href).toBe("/org");
    expect(items[3].href).toBe("/profile");
  });

  it("gibt 4 Items fuer Jugendmodus zurueck", () => {
    const items = getNavItems("youth");
    expect(items).toHaveLength(4);
    expect(items[0].href).toBe("/jugend");
    expect(items[1].href).toBe("/map");
    expect(items[2].href).toBe("/jugend/tauschen");
    expect(items[3].href).toBe("/jugend/gruppen");
  });

  it("keine Rolle hat Notfall-Item in der Navigation", () => {
    const roles: NavRole[] = [
      "senior",
      "helper",
      "caregiver",
      "org_admin",
      "youth",
    ];
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
