import { beforeEach, describe, expect, it, vi } from "vitest";

let mockUser: { id: string } | null = { id: "guardian-1" };
const mockAdminDb = { from: vi.fn() };
const mockCreateChildSetupInvitation = vi.fn();

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

vi.mock("@/lib/family-setup/child-setup.service", () => ({
  createChildSetupInvitation: mockCreateChildSetupInvitation,
}));

describe("POST /api/family-setup/child", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "guardian-1" };
    mockCreateChildSetupInvitation.mockResolvedValue({
      invitationId: "setup-1",
      status: "ready",
      token: "raw-token",
      shortCode: "ABCDEFGH",
      setupUrl: "http://localhost/setup/raw-token",
      expiresAt: "2026-05-15T10:00:00.000Z",
    });
  });

  it("requires an authenticated guardian", async () => {
    mockUser = null;
    const { POST } = await import("@/app/api/family-setup/child/route");

    const response = await POST(
      new Request("http://localhost/api/family-setup/child", {
        method: "POST",
        body: JSON.stringify({ childDisplayName: "Mia", childBirthYear: 2012 }),
      }) as never,
    );

    expect(response.status).toBe(401);
  });

  it("creates a child setup invitation for the signed-in user", async () => {
    const { POST } = await import("@/app/api/family-setup/child/route");

    const response = await POST(
      new Request("http://localhost/api/family-setup/child", {
        method: "POST",
        body: JSON.stringify({
          childDisplayName: "Mia",
          childBirthYear: 2012,
          relationshipType: "parent",
        }),
      }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.setupUrl).toBe("http://localhost/setup/raw-token");
    expect(mockCreateChildSetupInvitation).toHaveBeenCalledWith(mockAdminDb, {
      guardianUserId: "guardian-1",
      childDisplayName: "Mia",
      childBirthYear: 2012,
      relationshipType: "parent",
      appUrl: "http://localhost",
    });
  });
});
