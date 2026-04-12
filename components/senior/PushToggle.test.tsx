// Nachbar.io — Tests for PushToggle (Senior Push Notification Toggle)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { PushToggle } from "./PushToggle";

// Mock @/lib/push
const mockIsPushSupported = vi.fn<() => boolean>();
const mockIsSubscribed = vi.fn<() => Promise<boolean>>();
const mockSubscribeToPush = vi.fn<() => Promise<boolean>>();
const mockUnsubscribeFromPush = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/push", () => ({
  isPushSupported: (...args: unknown[]) => mockIsPushSupported(...(args as [])),
  isSubscribed: (...args: unknown[]) => mockIsSubscribed(...(args as [])),
  subscribeToPush: (...args: unknown[]) => mockSubscribeToPush(...(args as [])),
  unsubscribeFromPush: (...args: unknown[]) =>
    mockUnsubscribeFromPush(...(args as [])),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("PushToggle", () => {
  it("shows 'aktiv' when subscribed", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(true);

    render(<PushToggle />);

    await waitFor(() => {
      const status = screen.getByTestId("push-toggle-status");
      expect(status).toHaveTextContent("Benachrichtigungen aktiv");
    });

    expect(screen.getByTestId("push-toggle-button")).toHaveTextContent(
      "Ausschalten",
    );
  });

  it("shows 'aus' when not subscribed", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(false);

    render(<PushToggle />);

    await waitFor(() => {
      const status = screen.getByTestId("push-toggle-status");
      expect(status).toHaveTextContent("Benachrichtigungen aus");
    });

    expect(screen.getByTestId("push-toggle-button")).toHaveTextContent(
      "Einschalten",
    );
  });

  it("calls subscribeToPush on 'Einschalten' click", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockIsSubscribed.mockResolvedValue(false);
    mockSubscribeToPush.mockResolvedValue(true);

    render(<PushToggle />);

    await waitFor(() => {
      expect(screen.getByTestId("push-toggle-button")).toHaveTextContent(
        "Einschalten",
      );
    });

    fireEvent.click(screen.getByTestId("push-toggle-button"));

    await waitFor(() => {
      expect(mockSubscribeToPush).toHaveBeenCalledTimes(1);
    });
  });

  it("shows unsupported message when push not supported", async () => {
    mockIsPushSupported.mockReturnValue(false);
    mockIsSubscribed.mockResolvedValue(false);

    render(<PushToggle />);

    await waitFor(() => {
      expect(
        screen.getByText("Ihr Gerät unterstützt keine Benachrichtigungen"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("push-toggle-button")).not.toBeInTheDocument();
  });
});
