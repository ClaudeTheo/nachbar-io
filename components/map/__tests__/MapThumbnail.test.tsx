import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MapThumbnail,
  createMapThumbnailMarkerPositions,
  createMapThumbnailLayout,
  createMapThumbnailViewport,
} from "@/components/map/MapThumbnail";

describe("createMapThumbnailLayout", () => {
  it("erzeugt ein zentriertes 3x3 Tile-Mosaik", () => {
    const layout = createMapThumbnailLayout(47.567, 8.064, 15);

    expect(layout.tiles).toHaveLength(9);
    expect(layout.width).toBe(768);
    expect(layout.height).toBe(768);
    expect(layout.offsetX).toBeGreaterThanOrEqual(256);
    expect(layout.offsetX).toBeLessThan(512);
    expect(layout.offsetY).toBeGreaterThanOrEqual(256);
    expect(layout.offsetY).toBeLessThan(512);
  });

  it("behandelt String-Koordinaten aus Runtime-Daten wie Zahlen", () => {
    const layout = createMapThumbnailLayout(
      "47.5535" as unknown as number,
      "7.964" as unknown as number,
      17,
    );

    expect(layout.tiles[0]?.tx).toBeGreaterThan(60000);
    expect(layout.tiles[0]?.ty).toBeGreaterThan(40000);
  });
});

describe("MapThumbnail", () => {
  it("leitet den Thumbnail-Ausschnitt aus den Punkt-Bounds ab", () => {
    const viewport = createMapThumbnailViewport({
      fallbackLat: 47.5535,
      fallbackLng: 7.964,
      fallbackZoom: 17,
      width: 480,
      height: 200,
      points: [
        { lat: 47.5535, lng: 7.964 },
        { lat: 47.5635, lng: 7.9456 },
        { lat: 47.5631, lng: 7.9655 },
      ],
    });

    expect(viewport.lat).toBeGreaterThan(47.557);
    expect(viewport.lng).toBeLessThan(7.96);
    expect(viewport.zoom).toBeLessThan(17);

    const markers = createMapThumbnailMarkerPositions({
      points: [
        { lat: 47.5535, lng: 7.964 },
        { lat: 47.5635, lng: 7.9456 },
        { lat: 47.5631, lng: 7.9655 },
      ],
      viewport,
      width: 480,
      height: 200,
    });

    expect(markers).toHaveLength(3);
    markers.forEach((marker) => {
      expect(marker.x).toBeGreaterThanOrEqual(0);
      expect(marker.x).toBeLessThanOrEqual(480);
      expect(marker.y).toBeGreaterThanOrEqual(0);
      expect(marker.y).toBeLessThanOrEqual(200);
    });
  });

  it("rendert Link, normalisiertes Label und 9 Tiles", () => {
    const { container } = render(
      <MapThumbnail
        lat={47.567}
        lng={8.064}
        zoom={15}
        label="Bad Saeckingen — Purkersdorfer Strasse"
        points={[
          { lat: 47.5535, lng: 7.964 },
          { lat: 47.5635, lng: 7.9456 },
          { lat: 47.5631, lng: 7.9655 },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Quartierskarte öffnen" }),
    ).toHaveAttribute("href", "/map");
    expect(
      screen.getByText("Bad Säckingen — Purkersdorfer Straße"),
    ).toBeInTheDocument();
    expect(screen.getByText("Antippen zum Öffnen")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(9);
    expect(container.querySelectorAll("span")).toHaveLength(3);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/13/",
    );
  });
});
