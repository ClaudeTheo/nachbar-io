import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QuarterStats } from "@/components/org/QuarterStats";

afterEach(cleanup);

const mockQueryFn = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          order: () => ({
            limit: () => mockQueryFn(),
          }),
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryFn.mockResolvedValue({ data: [] });
});

describe("QuarterStats", () => {
  it("zeigt Ladeindikator", () => {
    // Nie resolving Promise → bleibt im Ladezustand
    mockQueryFn.mockReturnValue(new Promise(() => {}));
    render(<QuarterStats quarterIds={["q-1"]} />);
    expect(screen.getByTestId("quarter-stats-loading")).toBeInTheDocument();
  });

  it("zeigt Leer-Hinweis ohne Daten", async () => {
    mockQueryFn.mockResolvedValue({ data: [] });
    render(<QuarterStats quarterIds={["q-1"]} />);
    await waitFor(() => {
      expect(screen.getByTestId("quarter-stats-empty")).toBeInTheDocument();
    });
    expect(screen.getByText(/Noch keine Statistiken/)).toBeInTheDocument();
  });

  it("zeigt Leer-Hinweis ohne Quartiere", async () => {
    render(<QuarterStats quarterIds={[]} />);
    await waitFor(() => {
      expect(screen.getByTestId("quarter-stats-empty")).toBeInTheDocument();
    });
  });

  it("zeigt aggregierte Statistiken", async () => {
    mockQueryFn.mockResolvedValue({
      data: [
        {
          snapshot_date: "2026-03-18",
          wah: 20,
          total_users: 45,
          active_users_7d: 30,
          active_users_30d: 40,
          posts_count: 15,
          events_count: 3,
          heartbeat_coverage: 75.0,
          checkin_frequency: 2.5,
          escalation_count: 1,
          plus_subscribers: 4,
        },
      ],
    });

    render(<QuarterStats quarterIds={["q-1"]} />);

    await waitFor(() => {
      expect(screen.getByTestId("quarter-stats")).toBeInTheDocument();
    });

    expect(screen.getByText("Bewohner gesamt")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("Aktive Haushalte")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Heartbeat-Abdeckung")).toBeInTheDocument();
    expect(screen.getByText("75 %")).toBeInTheDocument();
  });

  it("zeigt Einsamkeits-Warnung bei inaktiven Nutzern", async () => {
    mockQueryFn.mockResolvedValue({
      data: [
        {
          snapshot_date: "2026-03-18",
          wah: 10,
          total_users: 50,
          active_users_7d: 20,
          active_users_30d: 35,
          posts_count: 5,
          events_count: 1,
          heartbeat_coverage: 40.0,
          checkin_frequency: 1.0,
          escalation_count: 0,
          plus_subscribers: 2,
        },
      ],
    });

    render(<QuarterStats quarterIds={["q-1"]} />);

    await waitFor(() => {
      expect(screen.getByTestId("quarter-stats")).toBeInTheDocument();
    });

    // 50 total - 20 active = 30 inaktiv
    expect(screen.getByText(/30 Bewohner ohne Aktivität/)).toBeInTheDocument();
  });
});
