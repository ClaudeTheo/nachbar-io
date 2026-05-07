import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useGpioBridge } from "@/lib/terminal/useGpioBridge";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sentMessages: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emitMessage(data: string) {
    this.onmessage?.({ data });
  }
}

describe("useGpioBridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    FakeWebSocket.instances = [];
  });

  it("ignoriert kaputte gpio-Statuswerte statt gpioAvailable zu ueberschreiben", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);

    const { result, unmount } = renderHook(() => useGpioBridge());
    const socket = FakeWebSocket.instances[0];

    act(() => {
      socket.open();
    });

    await waitFor(() => expect(result.current.connected).toBe(true));

    act(() => {
      socket.emitMessage(JSON.stringify({ gpio: true }));
    });

    await waitFor(() => expect(result.current.gpioAvailable).toBe(true));

    act(() => {
      socket.emitMessage(JSON.stringify({ gpio: "yes" }));
    });

    expect(result.current.gpioAvailable).toBe(true);

    unmount();
  });
});
