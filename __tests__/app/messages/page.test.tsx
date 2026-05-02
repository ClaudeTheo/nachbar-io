import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import MessagesPage from "@/app/(app)/messages/page";

const mockPush = vi.fn();
const mockFrom = vi.fn();
const mockRemoveChannel = vi.fn();
const mockFetch = vi.fn();
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
          order: async () => ({ data: [], error: null }),
        }),
      }),
    };
  }

  throw new Error(`Unexpected table mock: ${table}`);
}

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
