"use client";

// GPS-Picker Karte — Innere Leaflet-Komponente (wird per dynamic() ohne SSR geladen)
// Zeigt eine interaktive Karte mit verschiebbarem Marker zur Standortauswahl

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Leaflet Marker-Icon Fix fuer Next.js (webpack bricht Standard-Icons)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// --- Typen ---

interface GpsPickerMapProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

// Bad Saeckingen Zentrum (Pilot-Quartier)
const DEFAULT_CENTER: [number, number] = [47.5535, 7.964];
const DEFAULT_ZOOM = 16;

// --- Klick-Handler Komponente ---

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// --- Karten-Groesse korrigieren (noetig bei aufklappbaren Containern) ---

function InvalidateSizeOnMount() {
  const map = useMap();

  useEffect(() => {
    // Leaflet berechnet die Container-Groesse beim Mount falsch,
    // wenn der Container gerade eingeblendet wird (height: 0 → 250px)
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// --- Karte zentrieren wenn sich Position aendert ---

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [map, lat, lng]);

  return null;
}

// --- Hauptkomponente ---

export default function GpsPickerMap({
  lat,
  lng,
  onLocationChange,
}: GpsPickerMapProps) {
  const hasPosition = lat !== null && lng !== null;
  const center: [number, number] = hasPosition
    ? [lat!, lng!]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: "250px", width: "100%" }}
      scrollWheelZoom={true}
      zoomControl={true}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Karten-Groesse nach Mount korrigieren */}
      <InvalidateSizeOnMount />

      {/* Klick auf Karte setzt Marker */}
      <MapClickHandler onMapClick={onLocationChange} />

      {/* Marker anzeigen wenn Position gesetzt */}
      {hasPosition && (
        <>
          <Marker
            position={[lat!, lng!]}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onLocationChange(pos.lat, pos.lng);
              },
            }}
          />
          <RecenterMap lat={lat!} lng={lng!} />
        </>
      )}
    </MapContainer>
  );
}
