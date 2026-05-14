import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClaimChildSetupInvitation = vi.fn();
const mockClaimSeniorSetupInvitation = vi.fn();
let previewRow: Record<string, unknown> | null = null;
let previewError: unknown = null;

const mockAdminDb = {
  from: vi.fn(() => {
    const terminal = Promise.resolve({ data: previewRow, error: previewError });
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockReturnValue(terminal);
    return chain;
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => mockAdminDb),
}));

vi.mock("@/lib/family-setup/child-setup.service", () => ({
  claimChildSetupInvitation: mockClaimChildSetupInvitation,
}));

vi.mock("@/lib/family-setup/senior-setup.service", () => ({
  claimSeniorSetupInvitation: mockClaimSeniorSetupInvitation,
}));

describe("/api/family-setup/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewError = null;
    previewRow = {
      flow_type: "child_direct",
      target_ui_mode: "youth",
      status: "ready",
      used_at: null,
      expires_at: "2099-05-14T10:10:00.000Z",
      metadata: { child_display_name: "Mia" },
    };
    mockClaimChildSetupInvitation.mockResolvedValue({
      userId: "child-user-1",
      redirectTo: "/jugend",
    });
    mockClaimSeniorSetupInvitation.mockResolvedValue({
      userId: "senior-user-1",
      redirectTo: "/kreis-start",
    });
  });

  it("returns a safe preview without invitation metadata", async () => {
    const { GET } = await import("@/app/api/family-setup/[token]/route");

    const response = await GET(
      new Request("http://localhost/api/family-setup/raw-token") as never,
      { params: Promise.resolve({ token: "raw-token" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      flowType: "child_direct",
      targetUiMode: "youth",
      expiresAt: "2099-05-14T10:10:00.000Z",
    });
  });

  it("claims child setup tokens through the child service", async () => {
    const { POST } = await import("@/app/api/family-setup/[token]/route");

    const response = await POST(
      new Request("http://localhost/api/family-setup/raw-token", {
        method: "POST",
        body: JSON.stringify({
          email: "mia@example.test",
          password: "SicheresPasswort123!",
          displayName: "Mia",
        }),
      }) as never,
      { params: Promise.resolve({ token: "raw-token" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.redirectTo).toBe("/jugend");
    expect(mockClaimChildSetupInvitation).toHaveBeenCalledWith(mockAdminDb, {
      token: "raw-token",
      email: "mia@example.test",
      password: "SicheresPasswort123!",
      displayName: "Mia",
    });
  });

  it("claims senior setup tokens through the senior service", async () => {
    previewRow = {
      flow_type: "senior_setup",
      target_ui_mode: "senior",
      status: "ready",
      used_at: null,
      expires_at: "2099-05-14T10:10:00.000Z",
    };
    const { POST } = await import("@/app/api/family-setup/[token]/route");

    const response = await POST(
      new Request("http://localhost/api/family-setup/raw-token", {
        method: "POST",
        body: JSON.stringify({
          email: "erika@example.test",
          password: "SicheresPasswort123!",
          displayName: "Erika",
        }),
      }) as never,
      { params: Promise.resolve({ token: "raw-token" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.redirectTo).toBe("/kreis-start");
    expect(mockClaimSeniorSetupInvitation).toHaveBeenCalledWith(mockAdminDb, {
      token: "raw-token",
      email: "erika@example.test",
      password: "SicheresPasswort123!",
      displayName: "Erika",
    });
  });

  it("uses a generic response for invalid or expired setup tokens", async () => {
    previewRow = null;
    previewError = { message: "not found" };
    const { GET } = await import("@/app/api/family-setup/[token]/route");

    const response = await GET(
      new Request("http://localhost/api/family-setup/bad-token") as never,
      { params: Promise.resolve({ token: "bad-token" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toBe("Setup-Code ist ungueltig oder abgelaufen.");
  });
});
