import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotificationMock = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => sendNotificationMock(...args),
  },
}));

import { broadcastPush } from "@/lib/services/push-notifications.service";

function makeSupabase() {
  const query = {
    select: vi.fn(() => query),
    limit: vi.fn(() => query),
    neq: vi.fn(() => query),
    in: vi.fn((_column: string, _values: string[]) =>
      Promise.resolve({
        data: [
          {
            id: "sub-1",
            user_id: "resident-1",
            endpoint: "https://push.example.test/1",
            p256dh: "key-1",
            auth: "auth-1",
          },
        ],
        error: null,
      }),
    ),
    then: (
      resolve: (value: {
        data: Array<{
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        }>;
        error: null;
      }) => void,
    ) =>
      resolve({
        data: [
          {
            id: "sub-1",
            user_id: "resident-1",
            endpoint: "https://push.example.test/1",
            p256dh: "key-1",
            auth: "auth-1",
          },
          {
            id: "sub-2",
            user_id: "resident-2",
            endpoint: "https://push.example.test/2",
            p256dh: "key-2",
            auth: "auth-2",
          },
        ],
        error: null,
      }),
  };

  return {
    query,
    supabase: {
      from: vi.fn(() => query),
    },
  };
}

describe("broadcastPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BNtest-vapid-public-key-base64url";
    process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key-base64url";
    sendNotificationMock.mockResolvedValue({});
  });

  it("filtert Broadcast-Subscriptions auf targetUserIds wenn Empfaenger vorab feststehen", async () => {
    const { supabase, query } = makeSupabase();

    const result = await broadcastPush(supabase as never, {
      title: "Hinweis",
      body: "Bitte beachten Sie die neue Info.",
      targetUserIds: ["resident-1"],
    });

    expect(query.in).toHaveBeenCalledWith("user_id", ["resident-1"]);
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });
});
