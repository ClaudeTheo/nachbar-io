"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import { AlertMapLayer } from "@/components/alerts/AlertMapLayer";
import type { AlertCategory } from "@/lib/supabase/types";
import "leaflet/dist/leaflet.css";

interface FamilyAlertMapProps {
  alerts: Array<{
    id: string;
    title: string;
    category: AlertCategory;
    status: "open" | "help_coming" | "resolved";
    location: { lat: number; lng: number; exact: boolean; source: string };
  }>;
  onHelp?: (alertId: string) => void;
}

export default function FamilyAlertMap({ alerts, onHelp }: FamilyAlertMapProps) {
  if (alerts.length === 0) return null;

  const center: [number, number] = [alerts[0].location.lat, alerts[0].location.lng];

  return (
    <MapContainer center={center} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AlertMapLayer alerts={alerts} onHelp={onHelp} />
    </MapContainer>
  );
}
