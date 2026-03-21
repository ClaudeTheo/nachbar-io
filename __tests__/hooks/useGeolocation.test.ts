import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeolocation } from "@/hooks/useGeolocation";

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();
Object.defineProperty(global.navigator, "geolocation", {
  value: { getCurrentPosition: mockGetCurrentPosition },
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("gibt initial null-Position zurück", () => {
    const { result } = renderHook(() => useGeolocation("map"));
    expect(result.current.position).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.needsDisclosure).toBe(false);
  });

  it("zeigt Disclosure wenn noch nicht akzeptiert", async () => {
    const { result } = renderHook(() => useGeolocation("emergency"));
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.needsDisclosure).toBe(true);
    // GPS wurde NICHT aufgerufen (Disclosure zuerst)
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it("requestPosition funktioniert nach Disclosure-Akzeptanz", async () => {
    // Disclosure vorher akzeptieren
    localStorageMock.setItem("nachbar-location-disclosed-map", "true");

    mockGetCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 47.5535, longitude: 7.964 } });
    });

    const { result } = renderHook(() => useGeolocation("map"));
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.position).toEqual({ lat: 47.5535, lng: 7.964 });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("acceptDisclosure setzt needsDisclosure auf false und startet GPS", async () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 47.5535, longitude: 7.964 } });
    });

    const { result } = renderHook(() => useGeolocation("emergency"));

    // Erst Disclosure anfordern
    await act(async () => {
      await result.current.requestPosition();
    });
    expect(result.current.needsDisclosure).toBe(true);

    // Dann akzeptieren
    await act(async () => {
      result.current.acceptDisclosure();
    });
    expect(result.current.needsDisclosure).toBe(false);
    expect(mockGetCurrentPosition).toHaveBeenCalled();
  });

  it("declineDisclosure setzt Fehlermeldung", async () => {
    const { result } = renderHook(() => useGeolocation("report"));

    await act(async () => {
      await result.current.requestPosition();
    });

    await act(async () => {
      result.current.declineDisclosure();
    });

    expect(result.current.needsDisclosure).toBe(false);
    expect(result.current.error).toBe("Standortzugriff abgelehnt");
  });

  it("setzt Fehler wenn GPS verweigert wird", async () => {
    localStorageMock.setItem("nachbar-location-disclosed-map", "true");

    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({ code: 1, message: "User denied Geolocation" });
    });

    const { result } = renderHook(() => useGeolocation("map"));
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.position).toBeNull();
    expect(result.current.error).toBe("GPS-Zugriff verweigert");
  });

  it("gibt Fehler zurück wenn Geolocation nicht unterstützt", async () => {
    localStorageMock.setItem("nachbar-location-disclosed-map", "true");
    const orig = global.navigator.geolocation;
    Object.defineProperty(global.navigator, "geolocation", { value: undefined, writable: true });

    const { result } = renderHook(() => useGeolocation("map"));
    await act(async () => {
      await result.current.requestPosition();
    });

    expect(result.current.error).toBe("GPS wird von Ihrem Browser nicht unterstützt");

    Object.defineProperty(global.navigator, "geolocation", { value: orig, writable: true });
  });
});
