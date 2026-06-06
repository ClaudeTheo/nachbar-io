import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  type MockChannel = {
    topic: string;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };

  const channels: MockChannel[] = [];

  const createCountQuery = () => {
    let eqCalls = 0;
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => {
        eqCalls += 1;
        return eqCalls >= 2 ? Promise.resolve({ count: 3 }) : query;
      }),
    };

    return query;
  };

  const state = {
    channels,
    from: vi.fn(() => createCountQuery()),
    channel: vi.fn((topic: string) => {
      let subscribed = false;
      const channel = {
        topic,
        on: vi.fn(() => {
          if (subscribed) {
            throw new Error(
              `cannot add postgres_changes callbacks for realtime:${topic} after subscribe().`,
            );
          }
          return channel;
        }),
        subscribe: vi.fn(() => {
          subscribed = true;
          return channel;
        }),
      };

      channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(() => Promise.resolve("ok")),
    reset: () => {
      channels.length = 0;
      state.from.mockClear();
      state.channel.mockClear();
      state.removeChannel.mockClear();
    },
  };

  return state;
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: supabaseState.from,
    channel: supabaseState.channel,
    removeChannel: supabaseState.removeChannel,
  }),
}));

vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

import { useUnreadCount } from "@/lib/useUnreadCount";

function Probe({ testId }: { testId: string }) {
  const { count } = useUnreadCount();
  return <output data-testid={testId}>{count}</output>;
}

afterEach(() => {
  cleanup();
  supabaseState.reset();
});

describe("useUnreadCount", () => {
  it("teilt eine Realtime-Subscription fuer mehrere Hook-Nutzer", async () => {
    const view = render(
      <>
        <Probe testId="unread-a" />
        <Probe testId="unread-b" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("unread-a")).toHaveTextContent("3");
      expect(screen.getByTestId("unread-b")).toHaveTextContent("3");
    });

    expect(supabaseState.channel).toHaveBeenCalledTimes(1);
    expect(supabaseState.channel.mock.calls[0]?.[0]).toMatch(
      /^unread-notifications-\d+$/,
    );
    expect(supabaseState.channels[0]?.on).toHaveBeenCalledTimes(1);
    expect(supabaseState.channels[0]?.subscribe).toHaveBeenCalledTimes(1);

    view.unmount();

    expect(supabaseState.removeChannel).toHaveBeenCalledTimes(1);
  });
});
