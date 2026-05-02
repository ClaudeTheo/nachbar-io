import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import MessagesPage from "@/app/(app)/messages/page";

const mockPush = vi.fn();
const mockFrom = vi.fn();
const mockRemoveChannel = vi.fn();
const mockFetch = vi.fn();
const userQueryTerminals: string[] = [];
let mockConversationRows: Array<{
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  created_at: string;
}> = [];
const mockAuthState: {
  user: { id: string } | null;
  loading: boolean;
} = {
  user: null,
  loading: true,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: { id: "quarter-1" },
  }),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
  }),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "vor 1 Minute",
}));

vi.mock("date-fns/locale", () => ({
  de: {},
}));

vi.mock("lucide-react", () => ({
  MessageCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-message-circle" {...props} />
  ),
  UserPlus: (props: Record<string, unknown>) => (
    <svg data-testid="icon-user-plus" {...props} />
  ),
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="icon-check" {...props} />
  ),
  X: (props: Record<string, unknown>) => (
    <svg data-testid="icon-x" {...props} />
  ),
  MapPin: (props: Record<string, unknown>) => (
    <svg data-testid="icon-map-pin" {...props} />
  ),
}));

vi.mock("@/components/ui", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  Skeleton: () => <div data-testid="skeleton" />,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  Separator: () => <hr />,
}));

vi.mock("@/components/chat/ResidentBrowser", () => ({
  ResidentBrowser: () => <div data-testid="resident-browser" />,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return { unsubscribe: vi.fn() };
      },
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

const pendingContacts = [
  {
    requester_id: "requester-1",
    addressee_id: "target-user-1",
    other_user_id: "requester-1",
    other_display_name: "Bernd M.",
    direction: "incoming",
    status: "pending",
    created_at: "2026-04-16T08:00:00.000Z",
    accepted_at: null,
    note: "Hallo aus dem Test",
  },
];

function createSupabaseTableMock(table: string) {
  if (table === "conversations") {
    return {
      select: () => ({
        or: () => ({
          order: async () => ({ data: mockConversationRows, error: null }),
        }),
      }),
    };
  }

  if (table === "users") {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      single: vi.fn().mockImplementation(() => {
        userQueryTerminals.push("single");
        return Promise.resolve({ data: null, error: null });
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        userQueryTerminals.push("maybeSingle");
        return Promise.resolve({ data: null, error: null });
      }),
    };
  }

  if (table === "direct_messages") {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      neq() {
        return this;
      },
      is() {
        return Promise.resolve({ count: 0, error: null });
      },
      order() {
        return this;
      },
      limit() {
        return this;
      },
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { content: null }, error: null }),
    };
  }

  throw new Error(`Unexpected table mock: ${table}`);
}

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userQueryTerminals.length = 0;
    mockConversationRows = [];
    mockAuthState.user = null;
    mockAuthState.loading = true;
    mockFrom.mockImplementation((table: string) => createSupabaseTableMock(table));
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(pendingContacts),
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("zeigt Skeletons solange Auth noch laedt", () => {
    render(<MessagesPage />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("laedt offene Anfragen, sobald der Auth-User spaeter verfuegbar ist", async () => {
    const { rerender } = render(<MessagesPage />);

    mockAuthState.user = { id: "target-user-1" };
    mockAuthState.loading = false;
    rerender(<MessagesPage />);

    await waitFor(() => {
    expect(screen.getByText("Nachbar-Anfragen")).toBeInTheDocument();
  });

    expect(screen.getByText("Bernd M.")).toBeInTheDocument();
    expect(screen.getByText(/Hallo aus dem Test/i)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/contacts?status=pending",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("nutzt den API-Fallback fuer Profilnamen und vermeidet optionale Profil-single-Reads", async () => {
    mockAuthState.user = { id: "target-user-1" };
    mockAuthState.loading = false;
    mockConversationRows = [
      {
        id: "conversation-1",
        participant_1: "target-user-1",
        participant_2: "requester-1",
        last_message_at: "2026-04-16T08:00:00.000Z",
        created_at: "2026-04-16T08:00:00.000Z",
      },
    ];
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/conversations")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: "conversation-1",
                peer_id: "requester-1",
                peer_display_name: "Bernd M.",
              },
            ]),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([]),
      });
    });

    render(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Bernd M.")).toBeInTheDocument();
    });

    expect(userQueryTerminals).toContain("maybeSingle");
    expect(userQueryTerminals).not.toContain("single");
  });
});
