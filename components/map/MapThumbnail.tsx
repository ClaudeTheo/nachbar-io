"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

interface MapThumbnailProps {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
}

const TILE_SIZE = 256;
const GRID_RADIUS = 1;
const MAX_WEB_MERCATOR_LAT = 85.05112878;

interface ThumbnailTile {
  key: string;
  tx: number;
  ty: number;
  left: number;
  top: number;
}

interface ThumbnailLayout {
  tiles: ThumbnailTile[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeTileX(x: number, tileCount: number): number {
  return ((x % tileCount) + tileCount) % tileCount;
}

export function createMapThumbnailLayout(
  lat: number,
  lng: number,
  zoom: number,
): ThumbnailLayout {
  const safeLat = clamp(lat, -MAX_WEB_MERCATOR_LAT, MAX_WEB_MERCATOR_LAT);
  const tileCount = 2 ** zoom;
  const latRad = (safeLat * Math.PI) / 180;

  const xFloat = ((lng + 180) / 360) * tileCount;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    tileCount;

  const tileX = Math.floor(xFloat);
  const tileY = Math.floor(yFloat);
  const fractionalX = xFloat - tileX;
  const fractionalY = yFloat - tileY;

  const gridSize = GRID_RADIUS * 2 + 1;
  const originTileX = tileX - GRID_RADIUS;
  const originTileY = tileY - GRID_RADIUS;

  const tiles: ThumbnailTile[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const tx = normalizeTileX(originTileX + col, tileCount);
      const ty = clamp(originTileY + row, 0, tileCount - 1);
      tiles.push({
        key: `${tx}-${ty}-${row}-${col}`,
        tx,
        ty,
        left: col * TILE_SIZE,
        top: row * TILE_SIZE,
      });
    }
  }

  return {
    tiles,
    width: gridSize * TILE_SIZE,
    height: gridSize * TILE_SIZE,
    offsetX: (GRID_RADIUS + fractionalX) * TILE_SIZE,
    offsetY: (GRID_RADIUS + fractionalY) * TILE_SIZE,
  };
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
  const layout = useMemo(
    () => createMapThumbnailLayout(lat, lng, zoom),
    [lat, lng, zoom],
  );

  return (
    <Link
      href="/map"
      className="block rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
      data-testid="info-map-thumbnail"
      aria-label="Quartierskarte oeffnen"
    >
      <div className="relative w-full" style={{ height: 200 }}>
        {/* Tile-Mosaik exakt auf den Quartier-Mittelpunkt zentrieren */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${-layout.offsetX}px, ${-layout.offsetY}px)`,
          }}
        >
          {layout.tiles.map((tile) => (
            <img
              key={tile.key}
              src={`https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tile.tx}/${tile.ty}@2x.png`}
              alt=""
              className="absolute object-cover"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                left: tile.left,
                top: tile.top,
              }}
              loading="lazy"
              draggable={false}
              referrerPolicy="no-referrer"
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
