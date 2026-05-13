import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

const hookMocks = vi.hoisted(() => ({
  useMapActivityPins: vi.fn(() => ({
    pins: [
      {
        id: "pin-1",
        type: "meeting",
        lat: 47.5668,
        lng: 8.0632,
        title: "Quartier-Treff",
        colorState: "green",
      },
    ],
    loading: false,
    error: null,
  })),
}));

// Mock react-leaflet (SSR-problematisch)
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div data-testid="circle-marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: {
      id: "test-q",
      name: "Laufenburg (Baden) — Altstadt",
      center_lat: 47.5670,
      center_lng: 8.0640,
      zoom_level: 17,
      map_config: { type: "leaflet", tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
    },
  }),
}));

vi.mock("@/lib/quarters/hooks", () => ({
  useUserRole: () => ({ role: "resident" }),
}));

vi.mock("@/lib/care/hooks/useSubscription", () => ({
  useSubscription: () => ({ subscription: { plan: "free" } }),
}));

vi.mock("@/lib/hooks/useMapStatuses", () => ({
  useMapStatuses: () => ({
    houses: [],
    geoHouses: [
      { id: "hs5", num: "5", s: "HS", x: 0, y: 0, defaultColor: "green", lat: 47.5668, lng: 8.0632 },
    ],
    statuses: { hs5: "green" },
    residentCounts: { "HS:5": 2 },
    loading: false,
  }),
}));

vi.mock("@/lib/hooks/useMapActivityPins", () => ({
  useMapActivityPins: hookMocks.useMapActivityPins,
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const Component = ({ activityPins = [] }: { activityPins?: unknown[] }) => (
      <div data-testid="leaflet-inner" data-pin-count={activityPins.length}>
        Map
      </div>
    );
    return Component;
  },
}));

describe("LeafletKarte", () => {
  afterEach(() => {
    cleanup();
    hookMocks.useMapActivityPins.mockClear();
  });

  it("exportiert die Komponente", async () => {
    const mod = await import("@/components/LeafletKarte");
    expect(mod.LeafletKarte).toBeDefined();
  });

  it("reicht geladene Activity-Pins an die Leaflet-Karte weiter", async () => {
    const { LeafletKarte } = await import("@/components/LeafletKarte");

    render(<LeafletKarte />);

    expect(screen.getByTestId("leaflet-inner")).toHaveAttribute(
      "data-pin-count",
      "1",
    );
    expect(hookMocks.useMapActivityPins).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });
});
