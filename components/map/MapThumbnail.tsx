"use client";

import { useCallback } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

interface MapThumbnailProps {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
}

/**
 * Statisches Karten-Thumbnail fuer quartier-info.
 * Nutzt OSM Static Tile als Hintergrundbild — kein JS-Kartenframework,
 * dadurch leichtgewichtig und schnell. Tap oeffnet /map.
 *
 * Tile-URL: CARTO Voyager (gleicher Provider wie LeafletMapInner).
 * DSGVO-konform: OpenStreetMap + CARTO, keine Tracking-Pixel.
 */
export function MapThumbnail({
  lat,
  lng,
  zoom = 15,
  label,
}: MapThumbnailProps) {
  // CARTO Voyager Tile — gleicher Style wie die Hauptkarte
  const tileUrl = useCallback(
    (z: number, x: number, y: number) =>
      `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`,
    [],
  );

  // Lon/Lat zu Tile-Koordinaten (Slippy Map Tilenames)
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );

  // 2x2 Grid fuer breitere Abdeckung (512x512 bei @2x Tiles)
  const tiles = [
    { tx: x, ty: y, pos: "0 0" },
    { tx: x + 1, ty: y, pos: "256px 0" },
    { tx: x, ty: y + 1, pos: "0 256px" },
    { tx: x + 1, ty: y + 1, pos: "256px 256px" },
  ];

  return (
    <Link
      href="/map"
      className="block rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
      data-testid="info-map-thumbnail"
      aria-label="Quartierskarte oeffnen"
    >
      <div className="relative w-full" style={{ height: 200 }}>
        {/* Tile-Grid */}
        <div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          {tiles.map((t, i) => (
            <img
              key={i}
              src={tileUrl(zoom, t.tx, t.ty)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ))}
        </div>

        {/* Zentrierter Pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center">
            <MapPin className="h-8 w-8 text-red-500 drop-shadow-md" />
          </div>
        </div>

        {/* Label-Overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <p className="text-sm font-medium text-white">
            {label ?? "Quartierskarte"}
          </p>
          <p className="text-xs text-white/80">Antippen zum Oeffnen</p>
        </div>
      </div>
    </Link>
  );
}
