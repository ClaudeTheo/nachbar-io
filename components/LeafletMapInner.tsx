"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { COLOR_CFG, STREET_LABELS, type GeoMapHouseData, type LampColor } from "@/lib/map-houses";
import "leaflet/dist/leaflet.css";

interface LeafletMapInnerProps {
  center: [number, number];
  zoom: number;
  tileUrl: string;
  houses: GeoMapHouseData[];
  statuses: Record<string, LampColor>;
  residentCounts: Record<string, number>;
  onHouseClick: (house: GeoMapHouseData) => void;
}

export default function LeafletMapInner({
  center, zoom, tileUrl, houses, statuses, residentCounts, onHouseClick,
}: LeafletMapInnerProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
      />

      {houses.map((house) => {
        const color = statuses[house.id] ?? "green";
        const cfg = COLOR_CFG[color];
        const streetName = STREET_LABELS[house.s] ?? house.s;
        const rc = residentCounts[`${house.s}:${house.num}`] ?? 0;

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
              <div className="text-sm font-semibold">{streetName} {house.num}</div>
              <div className="text-xs" style={{ color: cfg.fill }}>
                {cfg.label} · {rc} {rc === 1 ? "Bewohner" : "Bewohner"}
              </div>
              <button
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
