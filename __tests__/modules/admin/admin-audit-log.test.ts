import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserByAdmin } from "@/modules/admin/services/create-user.service";
import { processVerification } from "@/modules/admin/services/verify-address.service";
import { sendBroadcast } from "@/modules/admin/services/broadcast.service";
import { archiveQuarter } from "@/modules/admin/services/quarter-detail.service";
import {
  assignQuarterAdmin,
  removeQuarterAdmin,
} from "@/modules/admin/services/quarter-admins.service";

const mockSafeInsertNotification = vi.fn();
const mockSafeInsertNotifications = vi.fn();
const mockSendVerificationResultEmail = vi.fn();

vi.mock("@/lib/notifications-server", () => ({
  safeInsertNotification: (...args: unknown[]) =>
    mockSafeInsertNotification(...args),
  safeInsertNotifications: (...args: unknown[]) =>
    mockSafeInsertNotifications(...args),
}));

vi.mock("@/lib/email", () => ({
  sendVerificationResultEmail: (...args: unknown[]) =>
    mockSendVerificationResultEmail(...args),
}));

function makeCreateUserClient() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const userInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "new-user-1" } },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "households") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "household-1", quarter_id: "quarter-1" },
            error: null,
          }),
        };
        return chain;
      }

      if (table === "users") {
        return { insert: userInsert };
      }

      if (table === "household_members") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }

      if (table === "admin_audit_log") {
        return { insert: auditInsert };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { client, auditInsert, userInsert };
}

function makeVerificationClient() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { email: "resident@example.test" } },
          error: null,
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "verification_requests") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "request-1",
              user_id: "resident-1",
              household_id: "household-1",
              status: "pending",
            },
            error: null,
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          })),
        };
        return chain;
      }

      if (table === "users") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { display_name: "Ada" },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }

      if (table === "household_members") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          })),
        };
      }

      if (table === "admin_audit_log") {
        return { insert: auditInsert };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { client, auditInsert };
}

function makeBroadcastClient() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "resident-1" }, { id: "resident-2" }],
            error: null,
          }),
        };
      }

      if (table === "admin_audit_log") {
        return { insert: auditInsert };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { client, auditInsert };
}

function makeQuarterClient() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "quarters") {
        const chain = {
          update: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          select: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({
            data: { id: "quarter-1", name: "Bad Saeckingen", status: "archived" },
            error: null,
          }),
        };
        return chain;
      }

      if (table === "admin_audit_log") {
        return { insert: auditInsert };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { client, auditInsert };
}

function makeAssignQuarterAdminClient(targetRole = "user") {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const roleUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "quarters") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: "quarter-1" }, error: null }) }) }) };
      }
      if (table === "users") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: "user-1", role: targetRole }, error: null }) }) }),
          update: vi.fn(() => ({ eq: roleUpdateEq })),
        };
      }
      if (table === "quarter_admins") {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "qa-1", quarter_id: "quarter-1", user_id: "user-1" }, error: null }) }) }),
        };
      }
      if (table === "admin_audit_log") return { insert: auditInsert };
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  return { client, auditInsert, roleUpdateEq };
}

function makeRemoveQuarterAdminClient(remainingCount = 0, profileRole = "quarter_admin") {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "quarter_admins") {
        return {
          delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
          select: () => ({ eq: () => Promise.resolve({ count: remainingCount, error: null }) }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: profileRole }, error: null }) }) }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "admin_audit_log") return { insert: auditInsert };
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  return { client, auditInsert };
}

describe("admin audit log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ sent: 0 }),
    }));
  });

  it("protokolliert Admin-Create-User nach erfolgreicher Kontoanlage", async () => {
    const { client, auditInsert } = makeCreateUserClient();

    await createUserByAdmin(
      client as never,
      {
        displayName: "Ada Lovelace",
        street: "Rheinstrasse",
        houseNumber: "1",
        email: "ada@example.test",
      },
      "admin-1",
    );

    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "admin-1",
      action: "admin_create_user",
      target_type: "user",
      target_id: "new-user-1",
      details: {
        displayName: "Ada Lovelace",
        householdId: "household-1",
        household: "Rheinstrasse 1",
        uiMode: "senior",
        verified: true,
        quarterId: null,
        emailProvided: true,
      },
    });
  });

  it("erstellt Admin-Nutzer mit Komfort-Modus aus der zentralen Registry", async () => {
    const { client, auditInsert, userInsert } = makeCreateUserClient();

    await createUserByAdmin(
      client as never,
      {
        displayName: "Ada Lovelace",
        street: "Rheinstrasse",
        houseNumber: "1",
        email: "ada@example.test",
        uiMode: "comfort",
      },
      "admin-1",
    );

    expect(userInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ui_mode: "comfort",
      }),
    );
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          uiMode: "comfort",
        }),
      }),
    );
  });

  it("lehnt unbekannte UI-Modi vor der Auth-Kontoanlage ab", async () => {
    const { client } = makeCreateUserClient();

    await expect(
      createUserByAdmin(
        client as never,
        {
          displayName: "Ada Lovelace",
          street: "Rheinstrasse",
          houseNumber: "1",
          email: "ada@example.test",
          uiMode: "normal",
        },
        "admin-1",
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "Ungueltiger UI-Modus",
    });

    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("protokolliert Admin-Adressverifizierung nach Approve", async () => {
    const { client, auditInsert } = makeVerificationClient();

    await processVerification(client as never, {
      requestId: "request-1",
      action: "approve",
      note: "passt",
      reviewedBy: "admin-1",
      baseUrl: "https://nachbar.test",
    });

    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "admin-1",
      action: "admin_verify_address",
      target_type: "verification_request",
      target_id: "request-1",
      details: {
        action: "approve",
        targetUserId: "resident-1",
        householdId: "household-1",
        hasNote: true,
      },
    });
  });

  it("protokolliert Admin-Broadcast mit Empfaengerzahl", async () => {
    const { client, auditInsert } = makeBroadcastClient();

    await sendBroadcast(
      client as never,
      {
        title: "Hinweis",
        body: "Bitte beachten Sie die neue Info.",
        audience: "all",
        urgency: "urgent",
        baseUrl: "https://nachbar.test",
      },
      "admin-1",
    );

    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "admin-1",
      action: "admin_broadcast",
      target_type: "broadcast",
      details: {
        audience: "all",
        street: null,
        urgency: "urgent",
        recipientCount: 2,
        pushSent: 0,
      },
    });
  });

  it("reicht Admin-Broadcast-Empfaenger an den internen Push-Versand weiter", async () => {
    process.env.INTERNAL_API_SECRET = "internal-secret";
    const { client } = makeBroadcastClient();

    await sendBroadcast(
      client as never,
      {
        title: "Hinweis",
        body: "Bitte beachten Sie die neue Info.",
        audience: "all",
        urgency: "normal",
        baseUrl: "https://nachbar.test",
      },
      "admin-1",
    );

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://nachbar.test/api/push/send",
      expect.objectContaining({
        body: expect.stringContaining('"userIds":["resident-1","resident-2"]'),
      }),
    );
  });

  it("protokolliert Quartier-Archivierung durch Super-Admin", async () => {
    const { client, auditInsert } = makeQuarterClient();

    await archiveQuarter(client as never, "quarter-1", "admin-1");

    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "admin-1",
      action: "admin_quarter_archived",
      target_type: "quarter",
      target_id: "quarter-1",
      details: {
        status: "archived",
        name: "Bad Saeckingen",
      },
    });
  });

  it("protokolliert die Zuweisung eines Quartier-Admins (mit Rollen-Aenderung)", async () => {
    const { client, auditInsert } = makeAssignQuarterAdminClient("user");

    await assignQuarterAdmin(client as never, "quarter-1", "user-1", "admin-1");

    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "admin-1",
      action: "admin_assign_quarter_admin",
      target_type: "quarter_admin",
      target_id: "user-1",
      details: {
        quarterId: "quarter-1",
        roleChangedToQuarterAdmin: true,
      },
    });
  });

  it("protokolliert das Entfernen eines Quartier-Admins (mit Rollen-Reset)", async () => {
    const { client, auditInsert } = makeRemoveQuarterAdminClient(0, "quarter_admin");

    await removeQuarterAdmin(client as never, "quarter-1", "user-1", "admin-1");

    expect(auditInsert).toHaveBeenCalledWith({
      admin_id: "admin-1",
      action: "admin_remove_quarter_admin",
      target_type: "quarter_admin",
      target_id: "user-1",
      details: {
        quarterId: "quarter-1",
        roleResetToUser: true,
      },
    });
  });
});
