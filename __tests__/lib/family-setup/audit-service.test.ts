// __tests__/lib/family-setup/audit-service.test.ts
// Tests fuer Family-Setup Audit-Helper (Pass 63 FS-2)

import { describe, it, expect, vi } from "vitest";
import {
  extractAuditContextFromRequest,
  recordFamilySetupAudit,
} from "@/lib/family-setup/audit.service";

function createMockDb(opts: {
  insertResult?: { error: { message?: string; code?: string } | null };
  throwOnInsert?: Error;
} = {}) {
  const insertSpy = vi.fn(async (_payload: unknown) => {
    if (opts.throwOnInsert) throw opts.throwOnInsert;
    return opts.insertResult ?? { error: null };
  });
  const db = {
    from: vi.fn((table: string) => ({
      insert: insertSpy,
      __table: table,
    })),
  };
  return { db, insertSpy };
}

describe("recordFamilySetupAudit", () => {
  it("schreibt ein Audit-Event mit allen Feldern", async () => {
    const { db, insertSpy } = createMockDb();

    await recordFamilySetupAudit(db, {
      invitationId: "inv-1",
      actorUserId: "user-1",
      eventType: "invitation_claimed",
      context: { ip: "203.0.113.1", userAgent: "TestAgent/1.0" },
      metadata: { flow_type: "child_direct" },
    });

    expect(db.from).toHaveBeenCalledWith("family_setup_audit");
    expect(insertSpy).toHaveBeenCalledOnce();
    const payload = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.invitation_id).toBe("inv-1");
    expect(payload.actor_user_id).toBe("user-1");
    expect(payload.event_type).toBe("invitation_claimed");
    expect(typeof payload.ip_hash).toBe("string");
    expect((payload.ip_hash as string).length).toBe(64); // sha256 hex
    expect(typeof payload.user_agent_hash).toBe("string");
    expect(payload.metadata).toEqual({ flow_type: "child_direct" });
  });

  it("speichert NULL fuer ip_hash und user_agent_hash wenn Context fehlt", async () => {
    const { db, insertSpy } = createMockDb();

    await recordFamilySetupAudit(db, {
      invitationId: null,
      actorUserId: null,
      eventType: "invitation_rollback",
    });

    const payload = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.ip_hash).toBeNull();
    expect(payload.user_agent_hash).toBeNull();
    expect(payload.metadata).toEqual({});
  });

  it("wirft KEINE Exception wenn DB-Insert fehlschlaegt (best-effort)", async () => {
    const { db } = createMockDb({
      insertResult: { error: { code: "PGRST116", message: "permission denied" } },
    });

    await expect(
      recordFamilySetupAudit(db, {
        invitationId: "inv-2",
        actorUserId: "user-2",
        eventType: "invitation_claimed",
      }),
    ).resolves.toBeUndefined();
  });

  it("wirft KEINE Exception wenn DB-Insert eine Exception wirft", async () => {
    const { db } = createMockDb({
      throwOnInsert: new Error("ECONNREFUSED"),
    });

    await expect(
      recordFamilySetupAudit(db, {
        invitationId: null,
        actorUserId: null,
        eventType: "child_limit_review_triggered",
      }),
    ).resolves.toBeUndefined();
  });

  it("hashed IP deterministisch (gleiche IP → gleicher Hash)", async () => {
    const { db, insertSpy } = createMockDb();

    await recordFamilySetupAudit(db, {
      invitationId: "a",
      actorUserId: null,
      eventType: "invitation_claimed",
      context: { ip: "192.168.1.1", userAgent: null },
    });
    await recordFamilySetupAudit(db, {
      invitationId: "b",
      actorUserId: null,
      eventType: "invitation_claimed",
      context: { ip: "192.168.1.1", userAgent: null },
    });

    const hashA = (insertSpy.mock.calls[0][0] as Record<string, unknown>).ip_hash;
    const hashB = (insertSpy.mock.calls[1][0] as Record<string, unknown>).ip_hash;
    expect(hashA).toBe(hashB);
  });
});

describe("extractAuditContextFromRequest", () => {
  it("liest IP aus x-forwarded-for (erstes Element)", () => {
    const request = new Request("https://example.com/api/family-setup/abc", {
      headers: {
        "x-forwarded-for": "203.0.113.1, 10.0.0.1, 10.0.0.2",
        "user-agent": "TestBrowser/2.0",
      },
    });

    const context = extractAuditContextFromRequest(request);
    expect(context.ip).toBe("203.0.113.1");
    expect(context.userAgent).toBe("TestBrowser/2.0");
  });

  it("nimmt x-real-ip als Fallback", () => {
    const request = new Request("https://example.com/api/family-setup/abc", {
      headers: {
        "x-real-ip": "198.51.100.1",
        "user-agent": "TestBrowser/2.0",
      },
    });

    const context = extractAuditContextFromRequest(request);
    expect(context.ip).toBe("198.51.100.1");
  });

  it("liefert null wenn keine IP-Header vorhanden", () => {
    const request = new Request("https://example.com/api/family-setup/abc");
    const context = extractAuditContextFromRequest(request);
    expect(context.ip).toBeNull();
    expect(context.userAgent).toBeNull();
  });
});
