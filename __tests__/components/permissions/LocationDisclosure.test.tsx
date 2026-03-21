import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LocationDisclosure, isLocationDisclosed, markLocationDisclosed } from "@/components/permissions/LocationDisclosure";
import type { LocationPurpose } from "@/components/permissions/LocationDisclosure";

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

describe("LocationDisclosure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert Dialog mit Notfall-Text", () => {
    render(
      <LocationDisclosure purpose="emergency" onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText("Standortzugriff für Notfall")).toBeTruthy();
    expect(screen.getByText(/Rettungsdienst/)).toBeTruthy();
  });

  it("rendert Dialog mit Karten-Text", () => {
    render(
      <LocationDisclosure purpose="map" onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText("Standortzugriff für Quartierskarte")).toBeTruthy();
  });

  it("rendert Dialog mit Meldungs-Text", () => {
    render(
      <LocationDisclosure purpose="report" onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText("Standortzugriff für Meldung")).toBeTruthy();
  });

  it("ruft onAccept bei Klick auf Verstanden und setzt localStorage", () => {
    const onAccept = vi.fn();
    render(
      <LocationDisclosure purpose="emergency" onAccept={onAccept} onDecline={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Verstanden"));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nachbar-location-disclosed-emergency",
      "true",
    );
  });

  it("ruft onDecline bei Klick auf Ablehnen", () => {
    const onDecline = vi.fn();
    render(
      <LocationDisclosure purpose="map" onAccept={vi.fn()} onDecline={onDecline} />,
    );
    fireEvent.click(screen.getByText("Ablehnen"));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("hat aria-modal und role=dialog", () => {
    render(
      <LocationDisclosure purpose="emergency" onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("zeigt Mehr erfahren Link", () => {
    render(
      <LocationDisclosure purpose="report" onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    const link = screen.getByText("Mehr erfahren →");
    expect(link.getAttribute("href")).toBe("/datenschutz#standort");
  });
});

describe("isLocationDisclosed / markLocationDisclosed", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("gibt false zurueck wenn nicht gesetzt", () => {
    expect(isLocationDisclosed("emergency")).toBe(false);
  });

  it("gibt true zurueck nach markLocationDisclosed", () => {
    markLocationDisclosed("map");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nachbar-location-disclosed-map",
      "true",
    );
  });

  it("unterscheidet verschiedene Purposes", () => {
    markLocationDisclosed("emergency");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nachbar-location-disclosed-emergency",
      "true",
    );
    // map wurde nicht gesetzt
    expect(isLocationDisclosed("map")).toBe(false);
  });
});
