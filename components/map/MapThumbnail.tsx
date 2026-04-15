"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

interface MapThumbnailProps {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
  points?: ThumbnailPoint[];
}

const TILE_SIZE = 256;
const GRID_RADIUS = 1;
const MAX_WEB_MERCATOR_LAT = 85.05112878;
const THUMBNAIL_HEIGHT = 200;
const FALLBACK_THUMBNAIL_WIDTH = 360;
const THUMBNAIL_PADDING = 24;
const THUMBNAIL_MAX_ZOOM = 17;

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

export interface ThumbnailPoint {
  lat: number;
  lng: number;
}

interface ThumbnailViewport {
  lat: number;
  lng: number;
  zoom: number;
}

interface ThumbnailMarkerPosition {
  key: string;
  x: number;
  y: number;
}

const DISPLAY_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Saeckingen/g, "Säckingen"],
  [/Strasse/g, "Straße"],
  [/strasse/g, "straße"],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toCoordinate(value: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeTileX(x: number, tileCount: number): number {
  return ((x % tileCount) + tileCount) % tileCount;
}

function normalizeDisplayLabel(label: string): string {
  return DISPLAY_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    label,
  );
}

function latToWorldY(lat: number): number {
  const safeLat = clamp(
    toCoordinate(lat),
    -MAX_WEB_MERCATOR_LAT,
    MAX_WEB_MERCATOR_LAT,
  );
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function lngToWorldX(lng: number): number {
  return (toCoordinate(lng) + 180) / 360;
}

function worldYToLat(worldY: number): number {
  const n = Math.PI - 2 * Math.PI * worldY;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function worldXToLng(worldX: number): number {
  return worldX * 360 - 180;
}

function latLngToWorldPixels(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: lngToWorldX(lng) * scale,
    y: latToWorldY(lat) * scale,
  };
}

export function createMapThumbnailViewport({
  fallbackLat,
  fallbackLng,
  fallbackZoom,
  points,
  width,
  height,
  padding = THUMBNAIL_PADDING,
  maxZoom = THUMBNAIL_MAX_ZOOM,
}: {
  fallbackLat: number;
  fallbackLng: number;
  fallbackZoom: number;
  points?: ThumbnailPoint[];
  width: number;
  height: number;
  padding?: number;
  maxZoom?: number;
}): ThumbnailViewport {
  if (!points || points.length === 0) {
    return { lat: fallbackLat, lng: fallbackLng, zoom: fallbackZoom };
  }

  if (points.length === 1) {
    return {
      lat: points[0].lat,
      lng: points[0].lng,
      zoom: maxZoom,
    };
  }

  const worldXs = points.map((point) => lngToWorldX(point.lng));
  const worldYs = points.map((point) => latToWorldY(point.lat));
  const minX = Math.min(...worldXs);
  const maxX = Math.max(...worldXs);
  const minY = Math.min(...worldYs);
  const maxY = Math.max(...worldYs);

  const availableWidth = Math.max(width - padding * 2, 1);
  const availableHeight = Math.max(height - padding * 2, 1);
  const worldWidth = Math.max(maxX - minX, 1 / (TILE_SIZE * 2 ** maxZoom));
  const worldHeight = Math.max(maxY - minY, 1 / (TILE_SIZE * 2 ** maxZoom));

  const zoomForWidth = Math.log2(availableWidth / (TILE_SIZE * worldWidth));
  const zoomForHeight = Math.log2(
    availableHeight / (TILE_SIZE * worldHeight),
  );
  const zoom = clamp(
    Math.floor(Math.min(zoomForWidth, zoomForHeight)),
    0,
    maxZoom,
  );

  return {
    lat: worldYToLat((minY + maxY) / 2),
    lng: worldXToLng((minX + maxX) / 2),
    zoom,
  };
}

export function createMapThumbnailMarkerPositions({
  points,
  viewport,
  width,
  height,
}: {
  points?: ThumbnailPoint[];
  viewport: ThumbnailViewport;
  width: number;
  height: number;
}): ThumbnailMarkerPosition[] {
  if (!points || points.length === 0) return [];

  const center = latLngToWorldPixels(
    viewport.lat,
    viewport.lng,
    viewport.zoom,
  );

  return points
    .map((point, index) => {
      const world = latLngToWorldPixels(point.lat, point.lng, viewport.zoom);
      return {
        key: `${point.lat}-${point.lng}-${index}`,
        x: world.x - center.x + width / 2,
        y: world.y - center.y + height / 2,
      };
    })
    .filter(
      (marker) =>
        marker.x >= -12 &&
        marker.x <= width + 12 &&
        marker.y >= -12 &&
        marker.y <= height + 12,
    );
}

export function createMapThumbnailLayout(
  lat: number,
  lng: number,
  zoom: number,
): ThumbnailLayout {
  const safeLat = clamp(
    toCoordinate(lat),
    -MAX_WEB_MERCATOR_LAT,
    MAX_WEB_MERCATOR_LAT,
  );
  const tileCount = 2 ** zoom;
  const latRad = (safeLat * Math.PI) / 180;
  const safeLng = toCoordinate(lng);

  const xFloat = ((safeLng + 180) / 360) * tileCount;
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
  points = [],
}: MapThumbnailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [thumbnailWidth, setThumbnailWidth] = useState(FALLBACK_THUMBNAIL_WIDTH);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const updateWidth = (nextWidth?: number) => {
      const measuredWidth = nextWidth ?? node.getBoundingClientRect().width;
      if (measuredWidth > 0) {
        setThumbnailWidth(measuredWidth);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entryWidth = entries[0]?.contentRect.width;
      updateWidth(entryWidth);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(
    () =>
      createMapThumbnailViewport({
        fallbackLat: lat,
        fallbackLng: lng,
        fallbackZoom: zoom,
        points,
        width: thumbnailWidth,
        height: THUMBNAIL_HEIGHT,
      }),
    [lat, lng, points, thumbnailWidth, zoom],
  );
  const layout = useMemo(
    () => createMapThumbnailLayout(viewport.lat, viewport.lng, viewport.zoom),
    [viewport.lat, viewport.lng, viewport.zoom],
  );
  const markerPositions = useMemo(
    () =>
      createMapThumbnailMarkerPositions({
        points,
        viewport,
        width: thumbnailWidth,
        height: THUMBNAIL_HEIGHT,
      }),
    [points, thumbnailWidth, viewport],
  );
  const displayLabel = normalizeDisplayLabel(label ?? "Quartierskarte");

  return (
    <Link
      href="/map"
      className="block rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
      data-testid="info-map-thumbnail"
      aria-label="Quartierskarte öffnen"
    >
      <div
        ref={rootRef}
        className="relative w-full"
        style={{ height: THUMBNAIL_HEIGHT }}
      >
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
              src={`https://basemaps.cartocdn.com/rastertiles/voyager/${viewport.zoom}/${tile.tx}/${tile.ty}@2x.png`}
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

        {markerPositions.length > 0 ? (
          <div className="absolute inset-0 pointer-events-none">
            {markerPositions.map((marker) => (
              <span
                key={marker.key}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-quartier-green shadow-[0_0_0_3px_rgba(34,197,94,0.3)]"
                style={{
                  left: marker.x,
                  top: marker.y,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center">
              <MapPin className="h-8 w-8 text-red-500 drop-shadow-md" />
            </div>
          </div>
        )}

        {/* Label-Overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <p className="text-sm font-medium text-white">{displayLabel}</p>
          <p className="text-xs text-white/80">Antippen zum Öffnen</p>
        </div>
      </div>
    </Link>
  );
}
