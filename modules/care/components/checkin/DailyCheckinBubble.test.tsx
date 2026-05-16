import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import { DailyCheckinBubble } from "./DailyCheckinBubble";

vi.mock("@/components/gamification/PointsToast", () => ({
  showPointsToast: vi.fn(),
}));

describe("DailyCheckinBubble", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("fragt den Check-in-Status nicht ab, wenn die Sprechblase deaktiviert ist", async () => {
    render(<DailyCheckinBubble enabled={false} />);

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId("checkin-bubble")).not.toBeInTheDocument();
  });

  it("zeigt die Sprechblase nach Wartezeit, wenn Check-in offen und aktiviert ist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          checkinEnabled: true,
          completedCount: 0,
          totalCount: 1,
          allCompleted: false,
        }),
    });

    render(<DailyCheckinBubble enabled />);

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/care/checkin/status");

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId("checkin-bubble")).toBeInTheDocument();
    expect(screen.getByText("Gut")).toBeInTheDocument();
    expect(screen.getByText("Geht so")).toBeInTheDocument();
    expect(screen.getByText("Nicht gut")).toBeInTheDocument();
  });
});
