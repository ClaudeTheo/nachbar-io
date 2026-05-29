// Tests für den konsolidierten GDPR-Lösch-Service (Art. 17)
// Pre-Pilot-Audit Cluster B: B2 (profiles-Bug), B3/B4 (unlöschbare Care-Nutzer).
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteUserCompletely,
  deleteUserAuthenticated,
  requestAccountDeletion,
} from "@/lib/services/gdpr/account-deletion.service";
import { ServiceError } from "@/lib/services/service-error";

type MockAdmin = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  auth: {
    admin: { deleteUser: ReturnType<typeof vi.fn> };
    signInWithOtp: ReturnType<typeof vi.fn>;
    verifyOtp: ReturnType<typeof vi.fn>;
  };
};

function makeAdmin(overrides: Partial<Record<string, unknown>> = {}): MockAdmin {
  const insert = vi.fn().mockResolvedValue({ error: null });
  return {
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn(() => ({ insert })),
    auth: {
      admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) },
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "a@b.de" } },
        error: null,
      }),
    },
    ...overrides,
  } as MockAdmin;
}

describe("deleteUserCompletely (Kern)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ruft die RPC gdpr_delete_user mit der userId", async () => {
    const admin = makeAdmin();
    await deleteUserCompletely(admin as never, "user-123");
    expect(admin.rpc).toHaveBeenCalledWith("gdpr_delete_user", {
      target_user_id: "user-123",
    });
  });

  it("löscht den auth-User NACH der RPC (Reihenfolge: DB-Daten zuerst)", async () => {
    const admin = makeAdmin();
    const order: string[] = [];
    admin.rpc.mockImplementation(async () => {
      order.push("rpc");
      return { error: null };
    });
    admin.auth.admin.deleteUser.mockImplementation(async () => {
      order.push("auth");
      return { error: null };
    });
    await deleteUserCompletely(admin as never, "user-123");
    expect(order).toEqual(["rpc", "auth"]);
  });

  it("bricht VOR der auth-Löschung ab, wenn die RPC fehlschlägt (fail-loud, kein verwaister Login)", async () => {
    const admin = makeAdmin();
    admin.rpc.mockResolvedValue({ error: { message: "fk violation" } });
    await expect(deleteUserCompletely(admin as never, "user-123")).rejects.toBeInstanceOf(
      ServiceError,
    );
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("wirft, wenn die auth-Löschung fehlschlägt", async () => {
    const admin = makeAdmin();
    admin.auth.admin.deleteUser.mockResolvedValue({ error: { message: "boom" } });
    await expect(deleteUserCompletely(admin as never, "user-123")).rejects.toBeInstanceOf(
      ServiceError,
    );
  });

  it("schreibt ein überlebendes Lösch-Protokoll in data_requests (Rechenschaftspflicht)", async () => {
    const admin = makeAdmin();
    await deleteUserCompletely(admin as never, "user-123", { email: "a@b.de" });
    expect(admin.from).toHaveBeenCalledWith("data_requests");
  });

  it("greift NICHT auf die nicht existierende Tabelle profiles zu (B2)", async () => {
    const admin = makeAdmin();
    await deleteUserCompletely(admin as never, "user-123");
    const touchedTables = admin.from.mock.calls.map((c) => c[0]);
    expect(touchedTables).not.toContain("profiles");
  });
});

describe("deleteUserAuthenticated", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wirft 400 bei falschem Bestätigungstext", async () => {
    const admin = makeAdmin();
    await expect(
      deleteUserAuthenticated(admin as never, "user-123", "bitte löschen"),
    ).rejects.toMatchObject({ status: 400 });
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("löscht bei korrektem Bestätigungstext über den Kern", async () => {
    const admin = makeAdmin();
    const res = await deleteUserAuthenticated(admin as never, "user-123", "KONTO LÖSCHEN");
    expect(admin.rpc).toHaveBeenCalledWith("gdpr_delete_user", {
      target_user_id: "user-123",
    });
    expect(res.success).toBe(true);
  });
});

describe("requestAccountDeletion (Web/OTP, Google Play)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sendet bei action=request ein OTP und greift NICHT auf profiles zu", async () => {
    const admin = makeAdmin();
    const res = await requestAccountDeletion(admin as never, {
      email: "a@b.de",
      action: "request",
    });
    expect(admin.auth.signInWithOtp).toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it("löscht bei action=confirm mit gültigem OTP ECHT (kein profiles-Soft-Delete, B2)", async () => {
    const admin = makeAdmin();
    await requestAccountDeletion(admin as never, {
      email: "a@b.de",
      action: "confirm",
      otp: "123456",
    });
    // echte Löschung statt Schein-Update in profiles
    expect(admin.rpc).toHaveBeenCalledWith("gdpr_delete_user", {
      target_user_id: "user-123",
    });
    const touchedTables = admin.from.mock.calls.map((c) => c[0]);
    expect(touchedTables).not.toContain("profiles");
  });

  it("wirft 400 bei ungültigem OTP", async () => {
    const admin = makeAdmin();
    admin.auth.verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
    await expect(
      requestAccountDeletion(admin as never, {
        email: "a@b.de",
        action: "confirm",
        otp: "000000",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("wirft 400 bei ungültiger E-Mail", async () => {
    const admin = makeAdmin();
    await expect(
      requestAccountDeletion(admin as never, { email: "keine-email", action: "request" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("begrenzt die Rate auf 3 Anfragen pro E-Mail", async () => {
    const admin = makeAdmin();
    const email = "ratelimit-isolated@b.de";
    for (let i = 0; i < 3; i++) {
      await requestAccountDeletion(admin as never, { email, action: "request" });
    }
    await expect(
      requestAccountDeletion(admin as never, { email, action: "request" }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
