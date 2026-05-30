// Tests für den Retention-Cron (DSGVO Art. 5 Abs. 1 lit. e Speicherbegrenzung)
// Pre-Pilot-Audit Cluster B (B7): lief gegen nicht existierende Tabellen (checkins,
// messages, news_summaries) → faktisch wirkungslos; Care-/Art.9-Daten ohne Frist.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runRetentionCleanup } from "@/lib/services/cron-retention-cleanup.service";

interface DeleteLog {
  deleted: Array<{ table: string; col: string; val: string }>;
  inserted: string[];
}

function makeClient(log: DeleteLog) {
  return {
    from: (table: string) => ({
      delete: () => ({
        lt: (col: string, val: string) => {
          log.deleted.push({ table, col, val });
          return Promise.resolve({ count: 1, error: null });
        },
      }),
      insert: (_row: unknown) => {
        log.inserted.push(table);
        return Promise.resolve({ error: null });
      },
    }),
  };
}

describe("runRetentionCleanup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("löscht NUR aus real existierenden Tabellen (B7)", async () => {
    const log: DeleteLog = { deleted: [], inserted: [] };
    await runRetentionCleanup(makeClient(log) as never);
    const tables = log.deleted.map((d) => d.table);
    // Geister-Tabellen dürfen nie angefasst werden
    for (const ghost of ["checkins", "messages", "news_summaries"]) {
      expect(tables).not.toContain(ghost);
    }
  });

  it("erfasst die Care-/Art.9-Aktivitätsdaten mit Frist (care_checkins, heartbeats, care_sos_alerts)", async () => {
    const log: DeleteLog = { deleted: [], inserted: [] };
    await runRetentionCleanup(makeClient(log) as never);
    const tables = log.deleted.map((d) => d.table);
    expect(tables).toContain("care_checkins");
    expect(tables).toContain("heartbeats");
    expect(tables).toContain("care_sos_alerts");
  });

  it("löscht Direktnachrichten (real: direct_messages, nicht messages)", async () => {
    const log: DeleteLog = { deleted: [], inserted: [] };
    await runRetentionCleanup(makeClient(log) as never);
    const tables = log.deleted.map((d) => d.table);
    expect(tables).toContain("direct_messages");
  });

  it("filtert immer über ein Zeitfeld (created_at) in der Vergangenheit", async () => {
    const log: DeleteLog = { deleted: [], inserted: [] };
    await runRetentionCleanup(makeClient(log) as never);
    expect(log.deleted.length).toBeGreaterThan(0);
    for (const d of log.deleted) {
      expect(d.col).toBe("created_at");
      expect(new Date(d.val).getTime()).toBeLessThan(Date.now());
    }
  });

  it("protokolliert den Lauf (data_retention_log)", async () => {
    const log: DeleteLog = { deleted: [], inserted: [] };
    await runRetentionCleanup(makeClient(log) as never);
    expect(log.inserted).toContain("data_retention_log");
  });
});
