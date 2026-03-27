// components/care/DailyCheckinButton.test.tsx
// Nachbar.io — Tests für den Dashboard Check-in Button

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { DailyCheckinButton } from "./DailyCheckinButton";

// Next.js Navigation-Mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DailyCheckinButton", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  it("zeigt Button wenn Check-in ausstehend", async () => {
    // Status-Endpunkt: Check-in aktiviert, noch nicht erledigt
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          checkinEnabled: true,
          completedCount: 0,
          totalCount: 2,
          allCompleted: false,
        }),
    });

    render(<DailyCheckinButton />);

    await waitFor(() => {
      expect(screen.getByTestId("checkin-pending")).toBeInTheDocument();
      expect(screen.getByTestId("checkin-button")).toBeInTheDocument();
    });
  });

  it("zeigt erledigten Zustand wenn alle Check-ins abgeschlossen", async () => {
    // Status-Endpunkt: Alle Check-ins erledigt
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          checkinEnabled: true,
          completedCount: 2,
          totalCount: 2,
          allCompleted: true,
        }),
    });

    render(<DailyCheckinButton />);

    await waitFor(() => {
      expect(screen.getByTestId("checkin-done")).toBeInTheDocument();
      expect(screen.getByText("Check-in erledigt")).toBeInTheDocument();
      expect(screen.getByText(/2 von 2/)).toBeInTheDocument();
    });
  });

  it("zeigt Stimmungsauswahl nach Klick auf Haupt-Button", async () => {
    // Status-Endpunkt: Check-in ausstehend
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

    render(<DailyCheckinButton />);

    // Warten bis Button sichtbar, dann klicken
    await waitFor(() => {
      expect(screen.getByTestId("checkin-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("checkin-button"));

    // Stimmungsauswahl muss erscheinen
    expect(screen.getByTestId("checkin-mood")).toBeInTheDocument();
    expect(screen.getByText("Gut")).toBeInTheDocument();
    expect(screen.getByText("Geht so")).toBeInTheDocument();
    expect(screen.getByText("Nicht gut")).toBeInTheDocument();
  });

  it("hat 80px Touch-Targets auf Stimmungs-Buttons", async () => {
    // Status-Endpunkt: Check-in ausstehend
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

    render(<DailyCheckinButton />);

    // Warten bis Button sichtbar, dann klicken für Stimmungsauswahl
    await waitFor(() => {
      expect(screen.getByTestId("checkin-button")).toBeInTheDocument();
    });

    // Haupt-Button hat 80px minHeight
    const mainButton = screen.getByTestId("checkin-button");
    expect(mainButton.style.minHeight).toBe("80px");
    expect(mainButton.style.touchAction).toBe("manipulation");

    // Stimmungsauswahl öffnen
    fireEvent.click(mainButton);

    // Alle Mood-Buttons prüfen
    const moodButtons = screen.getAllByRole("button");
    moodButtons.forEach((btn) => {
      expect(btn.style.minHeight).toBe("80px");
      expect(btn.style.touchAction).toBe("manipulation");
    });
  });
});
