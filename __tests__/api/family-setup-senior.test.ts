import { beforeEach, describe, expect, it, vi } from "vitest";

let mockUser: { id: string } | null = { id: "relative-1" };
const mockAdminDb = { from: vi.fn() };
const mockCreateSeniorSetupInvitation = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => mockAdminDb),
}));

vi.mock("@/lib/family-setup/senior-setup.service", () => ({
  createSeniorSetupInvitation: mockCreateSeniorSetupInvitation,
}));

describe("POST /api/family-setup/senior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "relative-1" };
    mockCreateSeniorSetupInvitation.mockResolvedValue({
      invitationId: "setup-1",
      status: "ready",
      token: "raw-token",
      shortCode: "ABCDEFGH",
      setupUrl: "http://localhost/setup/raw-token",
      expiresAt: "2026-05-15T10:00:00.000Z",
    });
  });

  it("requires an authenticated relative", async () => {
    mockUser = null;
    const { POST } = await import("@/app/api/family-setup/senior/route");

    const response = await POST(
      new Request("http://localhost/api/family-setup/senior", {
        method: "POST",
        body: JSON.stringify({ seniorDisplayName: "Erika", relationshipType: "child" }),
      }) as never,
    );

    expect(response.status).toBe(401);
  });

  it("creates a senior setup invitation for the signed-in user", async () => {
    const { POST } = await import("@/app/api/family-setup/senior/route");

    const response = await POST(
      new Request("http://localhost/api/family-setup/senior", {
        method: "POST",
        body: JSON.stringify({
          seniorDisplayName: "Erika",
          relationshipType: "child",
          targetUiMode: "senior",
        }),
      }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.shortCode).toBe("ABCDEFGH");
    expect(mockCreateSeniorSetupInvitation).toHaveBeenCalledWith(mockAdminDb, {
      caregiverUserId: "relative-1",
      seniorDisplayName: "Erika",
      relationshipType: "child",
      targetUiMode: "senior",
      appUrl: "http://localhost",
    });
  });
});
