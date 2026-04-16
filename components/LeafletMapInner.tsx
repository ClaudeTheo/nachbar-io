"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import {
  COLOR_CFG,
  STREET_LABELS,
  type GeoMapHouseData,
  type LampColor,
} from "@/lib/map-houses";
import { MAP_STATUS_META } from "@/lib/map-statuses";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface LeafletMapInnerProps {
  center: [number, number];
  zoom: number;
  tileUrl: string;
  houses: GeoMapHouseData[];
  statuses: Record<string, LampColor>;
  residentCounts: Record<string, number>;
  onHouseClick: (house: GeoMapHouseData) => void;
}

// Stellt sicher dass die Karte korrekt initialisiert ist und alle Marker sichtbar sind.
// Behebt den "M0 0" SVG-Bug bei CircleMarker (Leaflet rendert Marker bevor
// das Container-Layout fertig ist → latLngToLayerPoint gibt (0,0) zurueck).
function MapUpdater({
  houses,
  center,
  zoom,
}: {
  houses: GeoMapHouseData[];
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    // invalidateSize zwingt Leaflet das Container-Layout neu zu berechnen
    // — behebt den M0 0 Bug wenn der Container beim ersten Render noch 0px hat
    const timer = setTimeout(() => {
      map.invalidateSize();

      if (houses.length > 0) {
        const bounds = L.latLngBounds(
          houses.map((h) => [h.lat, h.lng] as L.LatLngTuple),
        );
        // Padding damit Marker nicht am Rand kleben
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      } else {
        map.setView(center, zoom);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [map, houses, center, zoom]);

  return null;
}

export default function LeafletMapInner({
  center,
  zoom,
  tileUrl,
  houses,
  statuses,
  residentCounts,
  onHouseClick,
}: LeafletMapInnerProps) {
  return (
    <MapContainer
      className="quartier-leaflet-map"
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
        url={tileUrl}
        crossOrigin="anonymous"
      />

      <MapUpdater houses={houses} center={center} zoom={zoom} />

      {houses.map((house) => {
        const color = statuses[house.id] ?? "green";
        const cfg = COLOR_CFG[color];
        const streetName = STREET_LABELS[house.s] ?? house.s;
        const rc = residentCounts[house.id] ?? 0;

        return (
          <CircleMarker
            key={house.id}
            center={[house.lat, house.lng]}
            radius={12}
            pathOptions={{
              fillColor: cfg.fill,
              fillOpacity: 0.9,
              color: cfg.ring,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onHouseClick(house),
            }}
          >
            <Popup>
              <div className="text-sm font-semibold">
                {streetName} {house.num}
              </div>
              <div className="text-xs" style={{ color: cfg.fill }}>
                {MAP_STATUS_META[color].statusLabel} · {rc}{" "}
                {rc === 1 ? "Bewohner" : "Bewohner"}
              </div>
              <button
                type="button"
                className="mt-1 text-xs text-blue-600 underline"
                onClick={() => onHouseClick(house)}
              >
                Details anzeigen
              </button>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
