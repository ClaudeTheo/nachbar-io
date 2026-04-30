import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  ClipboardList: (props: Record<string, unknown>) => <svg {...props} />,
  Clock: (props: Record<string, unknown>) => <svg {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg {...props} />,
  MapPin: (props: Record<string, unknown>) => <svg {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg {...props} />,
  Filter: (props: Record<string, unknown>) => <svg {...props} />,
  ArrowLeft: (props: Record<string, unknown>) => <svg {...props} />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CardContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "helper-001" }, loading: false }),
}));

const mockHelperProfile = { id: "helper-profile-001" };

const mockMatches = [
  {
    id: "match-1",
    request_id: "h1",
    confirmed_at: null,
    created_at: "2026-03-27T10:00:00Z",
  },
  {
    id: "match-2",
    request_id: "h2",
    confirmed_at: "2026-03-27T12:00:00Z",
    created_at: "2026-03-26T10:00:00Z",
  },
  {
    id: "match-3",
    request_id: "h3",
    confirmed_at: null,
    created_at: "2026-03-25T10:00:00Z",
  },
];

const mockRequests = [
  {
    id: "h1",
    user_id: "requester-1",
    title: "Einkaufen",
    description: "Aldi",
    status: "open",
    category: "Einkaufen",
    created_at: "2026-03-27T10:00:00Z",
  },
  {
    id: "h2",
    user_id: "requester-2",
    title: "Gartenarbeit",
    description: "Rasen",
    status: "matched",
    category: "Garten",
    created_at: "2026-03-26T10:00:00Z",
  },
  {
    id: "h3",
    user_id: "requester-3",
    title: "Arztbegleitung",
    description: "",
    status: "closed",
    category: "Begleitung",
    created_at: "2026-03-25T10:00:00Z",
  },
];

const mockRequesters = [
  { id: "requester-1", display_name: "Frau Mueller" },
  { id: "requester-2", display_name: "Herr Schmidt" },
  { id: "requester-3", display_name: "Frau Weber" },
];

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "neighborhood_helpers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockHelperProfile, error: null }),
            }),
          }),
        };
      }

      if (table === "help_matches") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockMatches, error: null }),
            }),
          }),
        };
      }

      if (table === "help_requests") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockRequests, error: null }),
          }),
        };
      }

      if (table === "users") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockRequesters, error: null }),
          }),
        };
      }

      throw new Error(`Unexpected Supabase table in test: ${table}`);
    },
  }),
}));

import HelferTasksPage from "@/app/(app)/hilfe/tasks/page";

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("HelferTasksPage", () => {
  it("rendert die Seite mit Task-Liste", async () => {
    render(<HelferTasksPage />);
    await waitFor(() => {
      expect(screen.getByTestId("tasks-page")).toBeInTheDocument();
    });
  });

  it("zeigt Status-Uebersicht mit korrekten Zahlen", async () => {
    render(<HelferTasksPage />);
    await waitFor(() => {
      const overview = screen.getByTestId("status-overview");
      expect(overview).toBeInTheDocument();
    });
  });

  it("zeigt Filter-Optionen", async () => {
    render(<HelferTasksPage />);
    await waitFor(() => {
      expect(screen.getByTestId("task-filter")).toBeInTheDocument();
      expect(screen.getByTestId("filter-all")).toBeInTheDocument();
      expect(screen.getByTestId("filter-open")).toBeInTheDocument();
    });
  });

  it("filtert Tasks nach Status", async () => {
    render(<HelferTasksPage />);
    await waitFor(() => {
      expect(screen.getByTestId("task-h1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("filter-completed"));
    await waitFor(() => {
      expect(screen.queryByTestId("task-h1")).toBeNull();
      expect(screen.getByTestId("task-h3")).toBeInTheDocument();
    });
  });

  it("zeigt Anfragensteller-Name pro Task", async () => {
    render(<HelferTasksPage />);
    await waitFor(() => {
      expect(screen.getByText(/Frau Mueller/)).toBeInTheDocument();
    });
  });
});
