import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import ChatPage from "@/app/(app)/messages/[id]/page";

const mockPush = vi.fn();
const mockRemoveChannel = vi.fn();
const mockListConversations = vi.fn();
const userQueryTerminals: string[] = [];

const mockAuthState: {
  user: { id: string } | null;
  loading: boolean;
} = {
  user: { id: "user-a" },
  loading: false,
};

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "conversation-1" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/lib/chat/client", () => ({
  listConversations: () => mockListConversations(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("date-fns", () => ({
  format: () => "10:00",
  isToday: () => true,
  isYesterday: () => false,
}));

vi.mock("date-fns/locale", () => ({
  de: {},
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: (props: Record<string, unknown>) => (
    <svg data-testid="icon-arrow-left" {...props} />
  ),
  Send: (props: Record<string, unknown>) => (
    <svg data-testid="icon-send" {...props} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

function createTableMock(table: string) {
  if (table === "conversations") {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      update() {
        return this;
      },
      single: vi.fn().mockResolvedValue({
        data: {
          id: "conversation-1",
          participant_1: "user-a",
          participant_2: "user-b",
        },
        error: null,
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
      update() {
        return this;
      },
      eq() {
        return this;
      },
      neq() {
        return this;
      },
      is() {
        return Promise.resolve({ data: null, error: null });
      },
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  }

  throw new Error(`Unexpected table: ${table}`);
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => createTableMock(table),
    channel: () => ({
      on() {
        return this;
      },
      subscribe: vi.fn(),
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userQueryTerminals.length = 0;
    mockAuthState.user = { id: "user-a" };
    mockAuthState.loading = false;
    mockListConversations.mockResolvedValue([
      {
        id: "conversation-1",
        peer_id: "user-b",
        peer_display_name: "Bernd M.",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("nutzt den Konversations-Fallback und vermeidet 406 durch optionale Profil-single-Reads", async () => {
    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-partner-name")).toHaveTextContent(
        "Bernd M.",
      );
    });

    expect(userQueryTerminals).toContain("maybeSingle");
    expect(userQueryTerminals).not.toContain("single");
  });
});
