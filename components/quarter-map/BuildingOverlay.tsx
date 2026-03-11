"use client";

import { useEffect, useState } from "react";
import { Polygon } from "react-leaflet";
import { fetchBuildingsForArea, type GeoBuilding } from "@/lib/map-geo";

interface BuildingOverlayProps {
  bounds: { swLat: number; swLng: number; neLat: number; neLng: number };
}

export function BuildingOverlay({ bounds }: BuildingOverlayProps) {
  const [buildings, setBuildings] = useState<GeoBuilding[]>([]);

  useEffect(() => {
    fetchBuildingsForArea(bounds.swLat, bounds.swLng, bounds.neLat, bounds.neLng)
      .then(setBuildings)
      .catch(() => {
        // Overpass nicht erreichbar — kein Problem, Marker reichen
      });
  }, [bounds.swLat, bounds.swLng, bounds.neLat, bounds.neLng]);

  return (
    <>
      {buildings.map((b) => (
        <Polygon
          key={b.osmId}
          positions={b.outline}
          pathOptions={{
            color: "rgba(74,222,128,0.5)",
            fillColor: "rgba(74,222,128,0.08)",
            weight: 1,
            fillOpacity: 0.08,
          }}
        />
      ))}
    </>
  );
}
