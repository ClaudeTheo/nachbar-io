import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockBroadcastPush = vi.fn();
const mockCreateSupabaseClient = vi.fn((_url?: string, _key?: string) => ({
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string) => mockCreateSupabaseClient(url, key),
}));

vi.mock("@/lib/services/push-notifications.service", () => ({
  broadcastPush: (...args: unknown[]) => mockBroadcastPush(...args),
}));

import { POST } from "./route";

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": "internal-secret",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/push/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = "internal-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    mockBroadcastPush.mockResolvedValue({ sent: 1, failed: 0, cleaned: 0 });
  });

  it("reicht explizite userIds an broadcastPush weiter", async () => {
    const response = await POST(
      createRequest({
        title: "Hinweis",
        body: "Bitte beachten Sie die neue Info.",
        userIds: ["resident-1", "resident-2"],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockBroadcastPush).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetUserIds: ["resident-1", "resident-2"],
      }),
    );
  });
});
