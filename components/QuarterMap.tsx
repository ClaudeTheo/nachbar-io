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

  return (
    <QuarterMapInner
      households={households}
      onMarkerClick={onMarkerClick}
      className={className}
    />
  );
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
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
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

  // Licht-Icon: Hausnummer mit leuchtendem Status-Licht
  const createLightIcon = (
    status: "ok" | "alert" | "help_coming",
    houseNumber?: string
  ) => {
    const colors = {
      ok: { bg: "#4CAF87", glow: "0 0 6px 2px rgba(76,175,135,0.5)", pulse: "" },
      alert: {
        bg: "#F59E0B",
        glow: "0 0 10px 3px rgba(245,158,11,0.6)",
        pulse: "animation: pulse-alert 2s ease-in-out infinite;",
      },
      help_coming: { bg: "#22C55E", glow: "0 0 8px 2px rgba(34,197,94,0.5)", pulse: "" },
    };

    const { bg, glow, pulse } = colors[status];
    const size = status === "ok" ? 14 : 22;
    const fontSize = status === "ok" ? 9 : 12;
    const border = status === "ok" ? 2 : 3;

    return L.divIcon({
      className: "custom-marker",
      html: `<div style="
        position: relative;
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${bg}; border: ${border}px solid rgba(255,255,255,0.9);
        box-shadow: ${glow};
        ${status !== "ok" ? `display: flex; align-items: center; justify-content: center;
        font-size: ${fontSize}px; font-weight: 900; color: white;` : ""}
        ${pulse}
      ">${status === "alert" ? "!" : status === "help_coming" ? "✓" : ""}</div>${houseNumber ? `<div style="
        position: absolute; top: ${size + 2}px; left: 50%;
        transform: translateX(-50%);
        font-size: ${status === "ok" ? 9 : 10}px; font-weight: 700;
        color: #2D3142; white-space: nowrap;
        text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white;
      ">${houseNumber}</div>` : ""}`,
      iconSize: [size, size + 14],
      iconAnchor: [size / 2, size / 2],
    });
  };

  return (
    <>
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
          const status = hasAlert ? "alert" : helpComing ? "help_coming" : "ok";
          const icon = createLightIcon(status, household.house_number);

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
                  {household.alert ? (
                    <p className={`mt-1 font-medium ${hasAlert ? "text-alert-amber" : "text-quartier-green"}`}>
                      {household.alert.title}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Alles in Ordnung</p>
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
