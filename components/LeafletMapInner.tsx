"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { LglBwOutlinesLayer } from "@/components/map/lgl-bw-outlines-layer";
import {
  COLOR_CFG,
  STREET_LABELS,
  type GeoMapHouseData,
  type LampColor,
} from "@/lib/map-houses";
import { MAP_STATUS_META } from "@/lib/map-statuses";
import type { UserContext } from "@/lib/feature-flags";
import {
  createMapActivityPinSvgMarkup,
  getMapActivityPinDefinition,
  type MapActivityPin,
} from "@/lib/map-activity-pins";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface LeafletMapInnerProps {
  center: [number, number];
  zoom: number;
  tileUrl: string;
  houses: GeoMapHouseData[];
  statuses: Record<string, LampColor>;
  residentCounts: Record<string, number>;
  userCtx: UserContext;
  onHouseClick: (house: GeoMapHouseData) => void;
  activityPins?: MapActivityPin[];
  showBuildingOutlines?: boolean;
}

// Stellt sicher dass die Karte korrekt initialisiert ist und alle Marker sichtbar sind.
// Behebt den "M0 0" SVG-Bug bei CircleMarker (Leaflet rendert Marker bevor
// das Container-Layout fertig ist → latLngToLayerPoint gibt (0,0) zurueck).
function MapUpdater({
  houses,
  activityPins,
  center,
  zoom,
}: {
  houses: GeoMapHouseData[];
  activityPins: MapActivityPin[];
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    // invalidateSize zwingt Leaflet das Container-Layout neu zu berechnen
    // — behebt den M0 0 Bug wenn der Container beim ersten Render noch 0px hat
    const timer = setTimeout(() => {
      map.invalidateSize();

      const boundsPoints = [
        ...houses.map((h) => [h.lat, h.lng] as L.LatLngTuple),
        ...activityPins.map((pin) => [pin.lat, pin.lng] as L.LatLngTuple),
      ];

      if (boundsPoints.length > 0) {
        const bounds = L.latLngBounds(
          boundsPoints,
        );
        // Padding damit Marker nicht am Rand kleben
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      } else {
        map.setView(center, zoom);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [map, houses, activityPins, center, zoom]);

  return null;
}

const ACTIVITY_PIN_ICON_SIZE = 28;
const ACTIVITY_PIN_ICON_HEIGHT = Math.round((ACTIVITY_PIN_ICON_SIZE * 4) / 3);

function ActivityPinMarker({ pin }: { pin: MapActivityPin }) {
  const definition = getMapActivityPinDefinition(pin.type);
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "quartier-activity-pin-leaflet-marker",
        html: createMapActivityPinSvgMarkup(pin.type, {
          colorState: pin.colorState,
          size: ACTIVITY_PIN_ICON_SIZE,
          title: pin.title,
        }),
        iconSize: [ACTIVITY_PIN_ICON_SIZE, ACTIVITY_PIN_ICON_HEIGHT],
        iconAnchor: [ACTIVITY_PIN_ICON_SIZE / 2, ACTIVITY_PIN_ICON_HEIGHT - 3],
        popupAnchor: [0, -ACTIVITY_PIN_ICON_HEIGHT + 16],
      }),
    [pin.colorState, pin.title, pin.type],
  );

  return (
    <Marker icon={icon} position={[pin.lat, pin.lng]}>
      <Popup>
        <div className="min-w-40 text-sm">
          <p className="font-semibold text-slate-900">{pin.title}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {definition.label}
          </p>
          {pin.description && (
            <p className="mt-1 text-xs text-slate-500">{pin.description}</p>
          )}
          {pin.approximate && (
            <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              Ungefährer Bereich
            </p>
          )}
          {pin.href && (
            <a
              className="mt-2 inline-flex text-xs font-semibold text-blue-600 underline"
              href={pin.href}
            >
              Details öffnen
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function LeafletMapInner({
  center,
  zoom,
  tileUrl,
  houses,
  statuses,
  residentCounts,
  userCtx,
  onHouseClick,
  activityPins = [],
  showBuildingOutlines = true,
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
      {showBuildingOutlines && <LglBwOutlinesLayer userCtx={userCtx} />}

      <MapUpdater
        activityPins={activityPins}
        houses={houses}
        center={center}
        zoom={zoom}
      />

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

      {activityPins.map((pin) => (
        <ActivityPinMarker key={pin.id} pin={pin} />
      ))}
    </MapContainer>
  );
}
