// Tests für den konsolidierten GDPR-Export-Service (Art. 15/20)
// Pre-Pilot-Audit Cluster B: B5 (Export las nicht existierende Tabellen, ließ Care/Art.9 aus).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportAccountData } from "@/lib/services/gdpr/account-export.service";
import { GDPR_EXPORT_TABLES } from "@/lib/services/gdpr/user-data-registry";

// field-encryption mocken: prüfen, DASS entschlüsselt wird (ohne echten Key).
vi.mock("@/lib/care/field-encryption", () => ({
  decryptFieldsArray: vi.fn((rows: unknown[]) => rows),
}));
import { decryptFieldsArray } from "@/lib/care/field-encryption";

interface QueryLog {
  from: string[];
  filtered: Array<{ table: string; expr: string }>;
  inserted: string[];
}

function makeClient(log: QueryLog, rowsByTable: Record<string, unknown[]> = {}) {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    const result = {
      data: rowsByTable[table] ?? [],
      error: null,
      count: (rowsByTable[table] ?? []).length,
    };
    b.select = () => b;
    b.eq = (col: string, val: string) => {
      log.filtered.push({ table, expr: `${col}.eq.${val}` });
      return b;
    };
    b.or = (expr: string) => {
      log.filtered.push({ table, expr });
      return b;
    };
    b.order = () => b;
    b.limit = () => b;
    b.insert = (_row: unknown) => {
      log.inserted.push(table);
      return Promise.resolve({ error: null });
    };
    // thenable: await an jeder Stelle der Kette gibt das Ergebnis
    b.then = (resolve: (v: typeof result) => void) => resolve(result);
    return b;
  }
  return {
    from: (table: string) => {
      log.from.push(table);
      return builder(table);
    },
  };
}

describe("exportAccountData (Single Source)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exportiert jede Tabelle der Registry (Vollständigkeit Art. 15)", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log);
    const result = await exportAccountData(client as never, "user-123");

    for (const t of GDPR_EXPORT_TABLES) {
      expect(result.data).toHaveProperty(t.key);
      expect(log.from).toContain(t.table);
    }
  });

  it("enthält die Art.-9-Care-Daten (B5: wurden früher komplett ausgelassen)", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log);
    await exportAccountData(client as never, "user-123");
    // Stichproben der sensibelsten Tabellen
    for (const tbl of ["care_profiles", "care_medications", "care_checkins", "user_memory_facts"]) {
      expect(log.from).toContain(tbl);
    }
  });

  it("greift NIE auf nicht existierende Tabellen zu (B5: profiles/checkins/messages/…)", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log);
    await exportAccountData(client as never, "user-123");
    for (const ghost of ["profiles", "checkins", "messages", "hilfe_requests", "marketplace_listings", "reports", "user_passkeys", "gamification_scores"]) {
      expect(log.from).not.toContain(ghost);
    }
  });

  it("filtert JEDE Tabelle auf die userId (kein Fremddaten-Leck)", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log);
    await exportAccountData(client as never, "user-xyz");
    // Jede angefragte Tabelle (außer dem Audit-Insert) muss einen Filter auf user-xyz haben
    const dataTables = GDPR_EXPORT_TABLES.map((t) => t.table);
    for (const t of dataTables) {
      const f = log.filtered.filter((x) => x.table === t);
      expect(f.length).toBeGreaterThan(0);
      expect(f.every((x) => x.expr.includes("user-xyz"))).toBe(true);
    }
  });

  it("entschlüsselt verschlüsselte Felder für den Betroffenen", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log, { care_medications: [{ name: "aes256gcm:xxx" }] });
    await exportAccountData(client as never, "user-123");
    // decryptFieldsArray muss mit den Medikamenten-Feldern aufgerufen worden sein
    expect(decryptFieldsArray).toHaveBeenCalledWith(
      [{ name: "aes256gcm:xxx" }],
      expect.arrayContaining(["name", "dosage", "instructions"]),
    );
  });

  it("liefert count-Tabellen als Anzahl, nicht als Zeilen", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log, { push_subscriptions: [{ id: 1 }, { id: 2 }] });
    const result = await exportAccountData(client as never, "user-123");
    const pushKey = GDPR_EXPORT_TABLES.find((t) => t.table === "push_subscriptions")!.key;
    expect(result.data[pushKey]).toEqual({ count: 2 });
  });

  it("wirft bei fehlender userId (Sicherheit)", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log);
    await expect(exportAccountData(client as never, "")).rejects.toThrow();
  });

  it("schreibt einen Export-Audit-Eintrag", async () => {
    const log: QueryLog = { from: [], filtered: [], inserted: [] };
    const client = makeClient(log);
    await exportAccountData(client as never, "user-123");
    expect(log.inserted.length).toBeGreaterThan(0);
  });
});
