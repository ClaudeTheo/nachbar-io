// __tests__/hooks/useHeartbeat.test.ts
// Nachbar.io — Tests fuer useHeartbeat Hook

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks VOR dem Import
const mockGetCachedUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({})),
}));
vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
}));

const mockEnqueue = vi.fn();
const mockFlush = vi.fn();
vi.mock("@/lib/offline-queue", () => ({
  offlineQueue: {
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
    flush: (...args: unknown[]) => mockFlush(...args),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  useHeartbeat,
  _resetHeartbeatForTesting,
} from "@/lib/care/hooks/useHeartbeat";

describe("useHeartbeat", () => {
  beforeEach(() => {
    _resetHeartbeatForTesting(); // Globalen State zwischen Tests zuruecksetzen
    vi.useFakeTimers();
    mockGetCachedUser.mockResolvedValue({ user: { id: "user-1" } });
    mockFetch.mockResolvedValue({ ok: true });
    mockEnqueue.mockReset().mockResolvedValue(undefined);
    mockFlush.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("sendet Heartbeat beim Mount wenn User eingeloggt", async () => {
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/heartbeat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Pruefe body-Inhalt
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.source).toBe("app");
    expect(callBody.device_type).toBeDefined();
  });

  it("sendet keinen Heartbeat wenn kein User", async () => {
    mockGetCachedUser.mockResolvedValue({ user: null });

    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("erkennt desktop als device_type im Test-Kontext", async () => {
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // In jsdom ist userAgent nicht mobile/kiosk/tablet
    expect(callBody.device_type).toBe("desktop");
  });

  it("blockiert fetch-Fehler ohne Exception", async () => {
    mockFetch.mockRejectedValue(new Error("Netzwerkfehler"));

    // Darf keinen Fehler werfen
    await act(async () => {
      renderHook(() => useHeartbeat());
    });
    // Hook laeuft weiter — kein Crash
    expect(true).toBe(true);
  });

  it("enqueues heartbeat when fetch fails (offline)", async () => {
    mockFetch.mockRejectedValue(new Error("Failed to fetch"));

    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      "/api/heartbeat",
      expect.stringContaining('"source":"app"'),
    );
  });

  it("flushes offline queue on mount", async () => {
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    expect(mockFlush).toHaveBeenCalled();
  });

  it("sendet nur einmal innerhalb 60s Rate-Limit (global, BUG-10 Fix)", async () => {
    const { unmount } = await act(async () => {
      return renderHook(() => useHeartbeat());
    });
    unmount();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Sofort neuer Mount — Rate-Limit ist jetzt GLOBAL (nicht pro Instanz)
    // Daher wird der zweite Heartbeat korrekt blockiert
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    // BUG-10 Fix: Globaler Rate-Limiter verhindert doppelte Heartbeats bei Navigation
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
