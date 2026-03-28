import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { DailyCheckinButton } from "@/modules/care/components/checkin/DailyCheckinButton";

// Mock fetch fuer Check-in Status
function mockFetchDone() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        checkinEnabled: true,
        completedCount: 1,
        totalCount: 1,
        allCompleted: true,
      }),
  });
}

describe("DailyCheckinButton Auto-Dismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchDone();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("zeigt done-State mit auto-dismiss Klasse", async () => {
    await act(async () => {
      render(<DailyCheckinButton />);
    });

    const doneEl = screen.getByTestId("checkin-done");
    expect(doneEl).toBeInTheDocument();
    expect(doneEl.className).toContain("animate-auto-dismiss");
  });

  it("setzt dismissed nach animationEnd", async () => {
    await act(async () => {
      render(<DailyCheckinButton />);
    });

    const doneEl = screen.getByTestId("checkin-done");

    // Simuliere animationend (native DOM Event)
    act(() => {
      doneEl.dispatchEvent(new Event("animationend", { bubbles: true }));
    });

    // Nach dismiss sollte nichts mehr gerendert werden
    expect(screen.queryByTestId("checkin-done")).toBeNull();
  });

  it("respektiert prefers-reduced-motion mit setTimeout fallback", async () => {
    // Mock matchMedia fuer reduced-motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    await act(async () => {
      render(<DailyCheckinButton />);
    });

    const doneEl = screen.getByTestId("checkin-done");
    expect(doneEl).toBeInTheDocument();

    // Nach 3.5s sollte der Timer feuern
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByTestId("checkin-done")).toBeNull();
  });
});
