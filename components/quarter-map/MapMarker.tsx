"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { type LampColor, STREET_LABELS, type StreetCode } from "@/lib/map-houses";

interface MapMarkerProps {
  lat: number;
  lng: number;
  houseNumber: string;
  streetCode: StreetCode;
  color: LampColor;
  residentCount: number;
  dimmed: boolean;
  onClick: () => void;
}

// Status-Bezeichnungen
const STATUS_LABELS: Record<LampColor, string> = {
  green: "Alles in Ordnung",
  red: "Dringend",
  yellow: "Hinweis",
  blue: "Im Urlaub",
  orange: "Paketannahme",
};

export function MapMarker({ lat, lng, houseNumber, streetCode, color, residentCount, dimmed, onClick }: MapMarkerProps) {
  const cssClass = `house-marker house-marker--${color}${dimmed ? " house-marker--dimmed" : ""}`;

  const icon = L.divIcon({
    className: "",
    html: `<div class="${cssClass}">${houseNumber}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <Marker position={[lat, lng]} icon={icon} eventHandlers={{ click: onClick }}>
      <Tooltip className="nachbar-tooltip" direction="top" offset={[0, -14]}>
        <strong>{STREET_LABELS[streetCode]} {houseNumber}</strong>
        <br />
        <span style={{ color: "#94a3b8" }}>
          {STATUS_LABELS[color]} · {residentCount} Bewohner
        </span>
      </Tooltip>
    </Marker>
  );
}
