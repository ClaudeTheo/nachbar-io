import { beforeEach, describe, expect, it, vi } from "vitest";

let mockUser: { id: string } | null = { id: "child-1" };
const mockAdminDb = { from: vi.fn() };
const mockCreateYouthFriendInviteRequest = vi.fn();
const mockApproveYouthFriendInviteRequest = vi.fn();

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

vi.mock("@/lib/family-setup/youth-friend-invites.service", () => ({
  createYouthFriendInviteRequest: mockCreateYouthFriendInviteRequest,
  approveYouthFriendInviteRequest: mockApproveYouthFriendInviteRequest,
}));

describe("youth friend invite routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "child-1" };
    mockCreateYouthFriendInviteRequest.mockResolvedValue({
      requestId: "request-1",
      status: "pending_parent_approval",
    });
    mockApproveYouthFriendInviteRequest.mockResolvedValue({
      requestId: "request-1",
      status: "ready",
      setupUrl: "http://localhost/setup/raw-token",
      shortCode: "ABCDEF23",
      expiresAt: "2099-05-14T22:00:00.000Z",
    });
  });

  it("lets a signed-in youth create a pending friend request", async () => {
    const { POST } = await import(
      "@/app/api/family-setup/child/friend-request/route"
    );

    const response = await POST(
      new Request("http://localhost/api/family-setup/child/friend-request", {
        method: "POST",
        body: JSON.stringify({ friendDisplayName: "Leo" }),
      }) as never,
    );

    expect(response.status).toBe(201);
    expect(mockCreateYouthFriendInviteRequest).toHaveBeenCalledWith(mockAdminDb, {
      childUserId: "child-1",
      friendDisplayName: "Leo",
    });
  });

  it("lets the signed-in guardian approve a pending friend request", async () => {
    mockUser = { id: "guardian-1" };
    const { POST } = await import(
      "@/app/api/family-setup/child/friend-request/[id]/approve/route"
    );

    const response = await POST(
      new Request("http://localhost/api/family-setup/child/friend-request/request-1/approve", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "request-1" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.shortCode).toBe("ABCDEF23");
    expect(mockApproveYouthFriendInviteRequest).toHaveBeenCalledWith(mockAdminDb, {
      guardianUserId: "guardian-1",
      requestId: "request-1",
      appUrl: "http://localhost",
    });
  });
});
