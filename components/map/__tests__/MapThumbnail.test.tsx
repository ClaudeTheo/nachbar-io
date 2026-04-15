import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MapThumbnail,
  createMapThumbnailLayout,
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
});

describe("MapThumbnail", () => {
  it("rendert Link, Label und 9 Tiles", () => {
    const { container } = render(
      <MapThumbnail
        lat={47.567}
        lng={8.064}
        zoom={15}
        label="Laufenburg — Karte"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Quartierskarte oeffnen" }),
    ).toHaveAttribute("href", "/map");
    expect(screen.getByText("Laufenburg — Karte")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(9);
  });
});
