"use client";

import { useEffect, useState } from "react";
import { QUARTIER_CENTER, QUARTIER_ZOOM } from "@/lib/constants";
import type { Alert, Household } from "@/lib/supabase/types";

// Leaflet wird dynamisch importiert (kein SSR)
interface QuarterMapProps {
  households?: (Household & { alert?: Alert })[];
  onMarkerClick?: (householdId: string) => void;
  className?: string;
}

export function QuarterMap({
  households = [],
  onMarkerClick,
  className = "",
}: QuarterMapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <div
        className={`flex items-center justify-center bg-lightgray ${className}`}
        style={{ minHeight: "400px" }}
      >
        <p className="text-muted-foreground">Karte wird geladen...</p>
      </div>
    );
  }

  return <QuarterMapInner households={households} onMarkerClick={onMarkerClick} className={className} />;
}

// Innere Komponente die Leaflet nur auf dem Client importiert
function QuarterMapInner({
  households,
  onMarkerClick,
  className,
}: QuarterMapProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leaflet, setLeaflet] = useState<{
    MapContainer: React.ComponentType<any>;
    TileLayer: React.ComponentType<any>;
    Marker: React.ComponentType<any>;
    Popup: React.ComponentType<any>;
    L: typeof import("leaflet");
  } | null>(null);

  useEffect(() => {
    // Dynamischer Import von Leaflet (Client-only)
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
      // Standard-Icon-Fix für Leaflet mit Webpack/Next.js
      delete (L.default.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      setLeaflet({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        L: L.default,
      });
    });
  }, []);

  if (!leaflet) {
    return (
      <div
        className={`flex items-center justify-center bg-lightgray ${className}`}
        style={{ minHeight: "400px" }}
      >
        <p className="text-muted-foreground">Karte wird geladen...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = leaflet;

  // Custom Icons für verschiedene Status
  const createIcon = (color: string) =>
    L.divIcon({
      className: "custom-marker",
      html: `<div style="
        width: 24px; height: 24px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ${color === "#F59E0B" ? "animation: pulse-alert 2s ease-in-out infinite;" : ""}
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  const defaultIcon = createIcon("#4CAF87");
  const alertIcon = createIcon("#F59E0B");
  const helpComingIcon = createIcon("#22C55E");

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <MapContainer
        center={[QUARTIER_CENTER.lat, QUARTIER_CENTER.lng]}
        zoom={QUARTIER_ZOOM}
        className={`rounded-lg ${className}`}
        style={{ minHeight: "400px", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {households?.map((household) => {
          const hasAlert = household.alert?.status === "open";
          const helpComing = household.alert?.status === "help_coming";
          const icon = hasAlert ? alertIcon : helpComing ? helpComingIcon : defaultIcon;

          return (
            <Marker
              key={household.id}
              position={[household.lat, household.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick?.(household.id),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">
                    {household.street_name} {household.house_number}
                  </p>
                  {household.alert && (
                    <p className={`mt-1 ${hasAlert ? "text-alert-amber" : "text-quartier-green"}`}>
                      {household.alert.title}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
