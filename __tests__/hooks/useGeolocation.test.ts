import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeolocation } from "@/hooks/useGeolocation";

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();
Object.defineProperty(global.navigator, "geolocation", {
  value: { getCurrentPosition: mockGetCurrentPosition },
  writable: true,
});

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt initial null-Position zurück", () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.position).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("requestPosition setzt loading und ruft getCurrentPosition auf", async () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 47.5535, longitude: 7.964 } });
    });

    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.position).toEqual({ lat: 47.5535, lng: 7.964 });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("setzt Fehler wenn GPS verweigert wird", async () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({ code: 1, message: "User denied Geolocation" });
    });

    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.position).toBeNull();
    expect(result.current.error).toBe("GPS-Zugriff verweigert");
  });

  it("gibt Fehler zurück wenn Geolocation nicht unterstützt", async () => {
    const orig = global.navigator.geolocation;
    Object.defineProperty(global.navigator, "geolocation", { value: undefined, writable: true });

    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.error).toBe("GPS wird von Ihrem Browser nicht unterstützt");

    Object.defineProperty(global.navigator, "geolocation", { value: orig, writable: true });
  });
});
