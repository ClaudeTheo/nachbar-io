// lib/device-pairing/__tests__/use-refresh-rotation.test.ts
// Welle B Task B7: Refresh-Token Auto-Rotation Hook

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useRefreshTokenRotation,
  REFRESH_TOKEN_LS_KEY,
  USER_ID_LS_KEY,
  REFRESH_EXPIRES_LS_KEY,
} from "@/lib/device-pairing/use-refresh-rotation";

const fetchMock = vi.fn();

describe("useRefreshTokenRotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rotiert das Token sofort beim Mount und persistiert das neue", async () => {
    window.localStorage.setItem(REFRESH_TOKEN_LS_KEY, "old-rt");
    window.localStorage.setItem(USER_ID_LS_KEY, "u-1");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        refresh_token: "new-rt",
        user_id: "u-1",
        device_id: "dev-1",
        expires_at: "2026-10-19T00:00:00.000Z",
      }),
    });
    renderHook(() => useRefreshTokenRotation({ rotateImmediately: true }));
    await waitFor(() => {
      expect(window.localStorage.getItem(REFRESH_TOKEN_LS_KEY)).toBe("new-rt");
    });
    expect(window.localStorage.getItem(REFRESH_EXPIRES_LS_KEY)).toBe(
      "2026-10-19T00:00:00.000Z",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/device/pair/refresh");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      refresh_token: "old-rt",
    });
  });

  it("macht keinen Request wenn kein refresh_token in localStorage liegt", async () => {
    renderHook(() => useRefreshTokenRotation({ rotateImmediately: true }));
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loescht localStorage bei 401 (Token-Revoke)", async () => {
    window.localStorage.setItem(REFRESH_TOKEN_LS_KEY, "old-rt");
    window.localStorage.setItem(USER_ID_LS_KEY, "u-1");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "expired" }),
    });
    renderHook(() => useRefreshTokenRotation({ rotateImmediately: true }));
    await waitFor(() => {
      expect(window.localStorage.getItem(REFRESH_TOKEN_LS_KEY)).toBeNull();
    });
    expect(window.localStorage.getItem(USER_ID_LS_KEY)).toBeNull();
  });
});
