// Pilot-Reset-User-Cleanup — Tests fuer einmaligen Komplett-Reset
// vor Pilotstart: alle User loeschen ausser Founder-Allowlist.
// Code-Audit-Trail fuer den parallelen MCP-SQL-Pfad.

import { describe, expect, it, vi } from "vitest";

import {
  buildPilotResetCandidateList,
  executePilotResetUsersCleanup,
  PILOT_RESET_FOUNDER_ALLOWLIST,
  type PilotResetUserRow,
} from "@/lib/admin/pilot-reset-users-cleanup";

const founder: PilotResetUserRow = {
  id: "founder-id",
  email: "thomasth@gmx.de",
};

const friend1: PilotResetUserRow = {
  id: "friend-1",
  email: "tobias.gebler@web.de",
};

const friend2: PilotResetUserRow = {
  id: "friend-2",
  email: null,
};

describe("buildPilotResetCandidateList", () => {
  it("haelt Founder-E-Mail (lowercase) aus den Kandidaten heraus", () => {
    const result = buildPilotResetCandidateList([founder, friend1, friend2]);
    expect(result.candidates.map((c) => c.id)).toEqual(["friend-1", "friend-2"]);
    expect(result.allowlistSkips).toEqual([
      { id: "founder-id", email: "thomasth@gmx.de", reason: "founder-email" },
    ]);
  });

  it("schuetzt Founder auch bei case-mixed Email (ThomasTh@gmx.de)", () => {
    const mixed: PilotResetUserRow = { id: "f-mixed", email: "ThomasTh@gmx.de" };
    const result = buildPilotResetCandidateList([mixed, friend1]);
    expect(result.candidates.map((c) => c.id)).toEqual(["friend-1"]);
    expect(result.allowlistSkips[0].id).toBe("f-mixed");
  });

  it("schuetzt Founder auch bei UPPERCASE", () => {
    const upper: PilotResetUserRow = { id: "f-up", email: "THOMASTH@GMX.DE" };
    const result = buildPilotResetCandidateList([upper, friend1]);
    expect(result.candidates.map((c) => c.id)).toEqual(["friend-1"]);
    expect(result.allowlistSkips[0].id).toBe("f-up");
  });

  it("akzeptiert eine zusaetzliche Allowlist-Email (extra Founder o.ae.)", () => {
    const extra: PilotResetUserRow = { id: "extra", email: "extra@example.com" };
    const result = buildPilotResetCandidateList([founder, extra, friend1], {
      additionalAllowlistEmails: ["extra@example.com"],
    });
    expect(result.candidates.map((c) => c.id)).toEqual(["friend-1"]);
    expect(result.allowlistSkips.map((s) => s.id).sort()).toEqual([
      "extra",
      "founder-id",
    ]);
  });

  it("ignoriert User mit leerer ID", () => {
    const empty = { id: "", email: "x@y" } as PilotResetUserRow;
    const result = buildPilotResetCandidateList([empty, friend1]);
    expect(result.candidates.map((c) => c.id)).toEqual(["friend-1"]);
  });

  it("PILOT_RESET_FOUNDER_ALLOWLIST enthaelt thomasth@gmx.de in lowercase", () => {
    expect(PILOT_RESET_FOUNDER_ALLOWLIST).toContain("thomasth@gmx.de");
    expect(PILOT_RESET_FOUNDER_ALLOWLIST.every((e) => e === e.toLowerCase())).toBe(
      true,
    );
  });
});

describe("executePilotResetUsersCleanup", () => {
  function createDb(opts: {
    users: PilotResetUserRow[];
    deleteError?: { table: string; message: string };
  }) {
    const calls: Array<{ table: string; method: string; ids?: readonly string[] }> = [];
    const usersList = opts.users.map((u) => ({ id: u.id, email: u.email }));

    const fromMock = vi.fn((table: string) => {
      const builder = {
        select: vi.fn((_columns: string) => ({
          order: vi.fn(async () => ({
            data: table === "users" ? usersList : [],
            error: null,
          })),
        })),
        delete: vi.fn(() => ({
          in: vi.fn(async (_column: string, ids: readonly string[]) => {
            calls.push({ table, method: "delete", ids });
            if (opts.deleteError && opts.deleteError.table === table) {
              return { error: { message: opts.deleteError.message }, count: 0 };
            }
            return { error: null, count: ids.length };
          }),
        })),
      };
      return builder;
    });

    return { from: fromMock, _calls: calls };
  }

  function createAuthAdmin() {
    const calls: string[] = [];
    return {
      _calls: calls,
      deleteUser: vi.fn(async (id: string) => {
        calls.push(id);
        return { error: null };
      }),
    };
  }

  it("loescht alle User ausser Founder, in Reihenfolge Referenztabellen → users → auth", async () => {
    const db = createDb({ users: [founder, friend1, friend2] });
    const authAdmin = createAuthAdmin();

    const result = await executePilotResetUsersCleanup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      authAdmin,
      {
        confirmation: "PILOT-RESET-LOESCHEN:2",
        referenceTables: [
          ["household_members", "user_id"],
          ["notifications", "user_id"],
        ],
      },
    );

    expect(result.deletedUsers).toBe(2);
    expect(result.allowlistSkips.map((s) => s.id)).toEqual(["founder-id"]);

    // Reihenfolge: erst Referenztabellen, dann users, dann auth.deleteUser pro id
    const tableOrder = db._calls.map((c) => c.table);
    expect(tableOrder).toEqual([
      "household_members",
      "notifications",
      "users",
    ]);
    expect(authAdmin._calls.sort()).toEqual(["friend-1", "friend-2"]);
  });

  it("wirft, wenn Bestaetigung nicht zur Kandidaten-Anzahl passt", async () => {
    const db = createDb({ users: [founder, friend1, friend2] });
    const authAdmin = createAuthAdmin();

    await expect(
      executePilotResetUsersCleanup(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db as any,
        authAdmin,
        {
          confirmation: "PILOT-RESET-LOESCHEN:99",
          referenceTables: [],
        },
      ),
    ).rejects.toThrow(/PILOT-RESET-LOESCHEN:2/);
  });

  it("wirft, wenn Founder-Email nicht in der DB-Liste vorkommt (Sanity-Check)", async () => {
    const db = createDb({ users: [friend1, friend2] });
    const authAdmin = createAuthAdmin();

    await expect(
      executePilotResetUsersCleanup(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db as any,
        authAdmin,
        {
          confirmation: "PILOT-RESET-LOESCHEN:2",
          referenceTables: [],
          requireFounderPresent: true,
        },
      ),
    ).rejects.toThrow(/founder.*nicht.*gefunden/i);
  });

  it("wirft, wenn DB-Delete in einer Referenztabelle fehlschlaegt", async () => {
    const db = createDb({
      users: [founder, friend1],
      deleteError: { table: "notifications", message: "FK violation" },
    });
    const authAdmin = createAuthAdmin();

    await expect(
      executePilotResetUsersCleanup(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db as any,
        authAdmin,
        {
          confirmation: "PILOT-RESET-LOESCHEN:1",
          referenceTables: [["notifications", "user_id"]],
        },
      ),
    ).rejects.toThrow(/notifications.*FK violation/);
  });

  it("ueberspringt auth.deleteUser, wenn keine Kandidaten existieren", async () => {
    const db = createDb({ users: [founder] });
    const authAdmin = createAuthAdmin();

    const result = await executePilotResetUsersCleanup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      authAdmin,
      {
        confirmation: "PILOT-RESET-LOESCHEN:0",
        referenceTables: [],
      },
    );

    expect(result.deletedUsers).toBe(0);
    expect(authAdmin._calls).toEqual([]);
    expect(db._calls).toEqual([]);
  });
});
