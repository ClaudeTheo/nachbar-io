import { describe, it, expect, vi } from "vitest";
import {
  isSelfSelectablePilotRole,
  setPilotRoleServer,
  SELF_SELECTABLE_PILOT_ROLES,
} from "@/lib/services/profile.service";

// W4b-2: Profil-Selbstauskunft. Service laeuft ueber den ADMIN-Client (service_role),
// weil Mig 198 settings.pilot_role fuer Client-Schreibzugriffe sticky schuetzt.
// Sicherheits-Auflagen:
//  - IDOR: schreibt NUR den uebergebenen userId (kommt in der Route aus Cookie-Auth).
//  - Datensparsamkeit/Integritaet: schreibt NUR den pilot_role-Schluessel, andere
//    settings-Keys bleiben erhalten (Merge).
//  - Audit: jeder Wechsel schreibt einen audit_log-Eintrag (generische Tabelle).

// Sequenzieller from()-Mock: zeichnet update/insert-Payloads auf.
function createMockAdmin(currentSettings: Record<string, unknown> | null) {
  const ops = { updates: [] as unknown[], inserts: [] as Array<{ table: string; payload: unknown }> };
  const admin = {
    ops,
    from: vi.fn().mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.single = vi
        .fn()
        .mockReturnValue(Promise.resolve({ data: { settings: currentSettings }, error: null }));
      chain.update = vi.fn().mockImplementation((payload: unknown) => {
        ops.updates.push({ table, payload });
        return chain;
      });
      chain.insert = vi.fn().mockImplementation((payload: unknown) => {
        ops.inserts.push({ table, payload });
        return Promise.resolve({ error: null });
      });
      // Awaiten von .update().eq() ergibt { error: null }
      chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(res, rej);
      return chain;
    }),
  };
  return admin;
}

describe("isSelfSelectablePilotRole", () => {
  it("akzeptiert genau resident/caregiver/helper", () => {
    expect(SELF_SELECTABLE_PILOT_ROLES).toEqual(["resident", "caregiver", "helper"]);
    for (const role of SELF_SELECTABLE_PILOT_ROLES) {
      expect(isSelfSelectablePilotRole(role)).toBe(true);
    }
  });

  it("lehnt test_user und Unsinn ab (test_user ist KEINE Selbst-Auswahl)", () => {
    expect(isSelfSelectablePilotRole("test_user")).toBe(false);
    expect(isSelfSelectablePilotRole("admin")).toBe(false);
    expect(isSelfSelectablePilotRole("")).toBe(false);
    expect(isSelfSelectablePilotRole(null)).toBe(false);
    expect(isSelfSelectablePilotRole(undefined)).toBe(false);
    expect(isSelfSelectablePilotRole(42)).toBe(false);
  });
});

describe("setPilotRoleServer", () => {
  it("schreibt nur pilot_role und behaelt andere settings-Keys (Merge)", async () => {
    const admin = createMockAdmin({ pilot_role: "resident", ai_assistance_level: "off", is_test_user: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await setPilotRoleServer(admin as any, "user-1", "caregiver");

    expect(result).toBe("caregiver");
    expect(admin.ops.updates).toHaveLength(1);
    const update = admin.ops.updates[0] as { table: string; payload: { settings: Record<string, unknown> } };
    expect(update.table).toBe("users");
    expect(update.payload.settings).toEqual({
      pilot_role: "caregiver",
      ai_assistance_level: "off",
      is_test_user: false,
    });
  });

  it("schreibt einen audit_log-Eintrag mit from/to (ohne sensible Felder)", async () => {
    const admin = createMockAdmin({ pilot_role: "resident" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await setPilotRoleServer(admin as any, "user-1", "helper");

    expect(admin.ops.inserts).toHaveLength(1);
    const audit = admin.ops.inserts[0];
    expect(audit.table).toBe("audit_log");
    expect(audit.payload).toMatchObject({
      action: "pilot_role_self_updated",
      actor_id: "user-1",
      target_type: "user",
      target_id: "user-1",
      metadata: { from: "resident", to: "helper" },
    });
  });

  it("funktioniert auch wenn settings noch leer ist (from=null)", async () => {
    const admin = createMockAdmin(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await setPilotRoleServer(admin as any, "user-2", "resident");
    expect(result).toBe("resident");
    const update = admin.ops.updates[0] as { payload: { settings: Record<string, unknown> } };
    expect(update.payload.settings).toEqual({ pilot_role: "resident" });
    expect(admin.ops.inserts[0].payload).toMatchObject({ metadata: { from: null, to: "resident" } });
  });
});
