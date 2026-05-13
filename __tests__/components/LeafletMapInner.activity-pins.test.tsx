import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const leafletMocks = vi.hoisted(() => ({
  divIcon: vi.fn((options: Record<string, unknown>) => ({
    options,
  })),
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  latLngBounds: vi.fn((points: unknown[]) => ({ points })),
  setView: vi.fn(),
}));

vi.mock("leaflet", () => ({
  default: {
    divIcon: leafletMocks.divIcon,
    latLngBounds: leafletMocks.latLngBounds,
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="circle-marker">{children}</div>
  ),
  Marker: ({
    children,
    icon,
    position,
  }: {
    children?: React.ReactNode;
    icon?: { options?: { html?: string; className?: string } };
    position: [number, number];
  }) => (
    <div
      data-testid="activity-marker"
      data-icon-class={icon?.options?.className}
      data-icon-html={icon?.options?.html}
      data-position={JSON.stringify(position)}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMap: () => ({
    fitBounds: leafletMocks.fitBounds,
    invalidateSize: leafletMocks.invalidateSize,
    setView: leafletMocks.setView,
  }),
}));

vi.mock("@/components/map/lgl-bw-outlines-layer", () => ({
  LglBwOutlinesLayer: () => <div data-testid="lgl-layer" />,
}));

import LeafletMapInner from "@/components/LeafletMapInner";

describe("LeafletMapInner activity pins", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rendert optionale Activity-Pins als eigene Leaflet Marker", () => {
    render(
      <LeafletMapInner
        activityPins={[
          {
            id: "pin-lernen",
            type: "learning",
            lat: 47.5535,
            lng: 7.964,
            title: "Lerntreff am Rhein",
            description: "Heute 17 Uhr",
          },
        ]}
        center={[47.5535, 7.964]}
        houses={[]}
        onHouseClick={vi.fn()}
        residentCounts={{}}
        statuses={{}}
        tileUrl="https://tiles.example/{z}/{x}/{y}.png"
        userCtx={{ role: "resident", plan: "free" }}
        zoom={16}
      />,
    );

    const marker = screen.getByTestId("activity-marker");

    expect(marker).toHaveAttribute("data-position", "[47.5535,7.964]");
    expect(marker).toHaveAttribute(
      "data-icon-class",
      "quartier-activity-pin-leaflet-marker",
    );
    expect(marker.getAttribute("data-icon-html")).toContain(
      'data-activity-pin-type="learning"',
    );
    expect(leafletMocks.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        iconAnchor: [14, 34],
        iconSize: [28, 37],
      }),
    );
    expect(screen.getByText("Lerntreff am Rhein")).toBeTruthy();
    expect(screen.getByText("Heute 17 Uhr")).toBeTruthy();
    expect(screen.getByText("Lernen")).toBeTruthy();
  });

  it("zeigt ungefaehre Bereiche im Popup, ohne die Marker-Daten zu veraendern", () => {
    render(
      <LeafletMapInner
        activityPins={[
          {
            id: "pin-warnung",
            type: "warning",
            lat: 47.554,
            lng: 7.965,
            title: "Hinweis im Quartier",
            approximate: true,
          },
        ]}
        center={[47.5535, 7.964]}
        houses={[]}
        onHouseClick={vi.fn()}
        residentCounts={{}}
        statuses={{}}
        tileUrl="https://tiles.example/{z}/{x}/{y}.png"
        userCtx={{ role: "resident", plan: "free" }}
        zoom={16}
      />,
    );

    expect(screen.getByText("Hinweis im Quartier")).toBeTruthy();
    expect(screen.getByText("Ungefährer Bereich")).toBeTruthy();
    expect(screen.getByTestId("activity-marker")).toHaveAttribute(
      "data-position",
      "[47.554,7.965]",
    );
  });

  it("kann externe Gebaeude-Umrisse fuer lokale Previews abschalten", () => {
    render(
      <LeafletMapInner
        activityPins={[]}
        center={[47.5535, 7.964]}
        houses={[]}
        onHouseClick={vi.fn()}
        residentCounts={{}}
        showBuildingOutlines={false}
        statuses={{}}
        tileUrl="https://tiles.example/{z}/{x}/{y}.png"
        userCtx={{ role: "resident", plan: "free" }}
        zoom={16}
      />,
    );

    expect(screen.queryByTestId("lgl-layer")).toBeNull();
  });
});
