import { describe, it, expect, vi } from "vitest";

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

vi.mock("next/dynamic", () => ({
  default: () => {
    const Component = () => <div data-testid="leaflet-inner">Map</div>;
    return Component;
  },
}));

describe("LeafletKarte", () => {
  it("exportiert die Komponente", async () => {
    const mod = await import("@/components/LeafletKarte");
    expect(mod.LeafletKarte).toBeDefined();
  });
});
