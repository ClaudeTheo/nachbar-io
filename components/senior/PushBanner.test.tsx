// Nachbar.io — Tests for PushBanner (Senior Push Notification Onboarding)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { PushBanner } from "./PushBanner";

// Mock @/lib/push
const mockIsPushSupported = vi.fn<() => boolean>();
const mockIsSubscribed = vi.fn<() => Promise<boolean>>();
const mockSubscribeToPush = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/push", () => ({
  isPushSupported: (...args: unknown[]) => mockIsPushSupported(...(args as [])),
  isSubscribed: (...args: unknown[]) => mockIsSubscribed(...(args as [])),
  subscribeToPush: (...args: unknown[]) => mockSubscribeToPush(...(args as [])),
}));

// Mock lucide-react Bell icon
vi.mock("lucide-react", () => ({
  Bell: (props: Record<string, unknown>) => (
    <svg data-testid="bell-icon" {...props} />
  ),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("PushBanner", () => {
  it("shows nothing when push not supported", async () => {
    mockIsPushSupported.mockReturnValue(false);
    mockIsSubscribed.mockResolvedValue(false);

    const { container } = render(<PushBanner />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("shows nothing when already subscribed", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(true);

    const { container } = render(<PushBanner />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("shows banner when not subscribed and not dismissed", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(false);

    render(<PushBanner />);

    await waitFor(() => {
      expect(
        screen.getByText("Benachrichtigungen einschalten"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Damit Sie Erinnerungen und Notfall-Antworten erhalten.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("hides banner after 'Später' click and sets localStorage", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(false);

    render(<PushBanner />);

    await waitFor(() => {
      expect(screen.getByText("Später")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Später"));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "push-banner-dismissed",
      "true",
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Benachrichtigungen einschalten"),
      ).not.toBeInTheDocument();
    });
  });

  it("calls subscribeToPush on 'Einschalten' click", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(false);
    mockSubscribeToPush.mockResolvedValue(true);

    render(<PushBanner />);

    await waitFor(() => {
      expect(screen.getByText("Einschalten")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Einschalten"));

    await waitFor(() => {
      expect(mockSubscribeToPush).toHaveBeenCalledTimes(1);
    });
  });
});
