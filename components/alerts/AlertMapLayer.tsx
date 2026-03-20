"use client";

import { Circle, Marker, Popup } from "react-leaflet";
import type { AlertCategory } from "@/lib/supabase/types";

interface AlertMapItem {
  id: string;
  title: string;
  category: AlertCategory;
  status: "open" | "help_coming" | "resolved";
  location: {
    lat: number;
    lng: number;
    exact: boolean;
    source: string;
  };
}

interface AlertMapLayerProps {
  alerts: AlertMapItem[];
  onHelp?: (alertId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  fire: "#ef4444",
  health_concern: "#ef4444",
  crime: "#ef4444",
  fall: "#f97316",
  water_damage: "#3b82f6",
  power_outage: "#f59e0b",
};

export function AlertMapLayer({ alerts, onHelp }: AlertMapLayerProps) {
  return (
    <>
      {alerts.map((alert) => {
        const color = CATEGORY_COLORS[alert.category] ?? "#6b7280";

        if (alert.location.exact) {
          return (
            <Marker key={alert.id} position={[alert.location.lat, alert.location.lng]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{alert.title}</p>
                  {alert.status === "open" && onHelp && (
                    <button
                      onClick={() => onHelp(alert.id)}
                      className="mt-1 rounded bg-quartier-green px-2 py-1 text-xs text-white"
                    >
                      Ich kann helfen
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        }

        return (
          <Circle
            key={alert.id}
            center={[alert.location.lat, alert.location.lng]}
            radius={50}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{alert.title}</p>
                <p className="text-xs text-gray-500">Ungefährer Bereich (~50m)</p>
                {alert.status === "open" && onHelp && (
                  <button
                    onClick={() => onHelp(alert.id)}
                    className="mt-1 rounded bg-quartier-green px-2 py-1 text-xs text-white"
                  >
                    Ich kann helfen
                  </button>
                )}
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}
