"use client";

// GPS-Picker — Wiederverwendbare Standortauswahl mit Leaflet-Karte
// Wrapper-Komponente mit dynamic import (SSR-sicher), GPS-Button und Textfeld

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, Loader2, Navigation, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// Leaflet muss client-side geladen werden (kein SSR)
const GpsPickerMap = dynamic(() => import("./GpsPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[250px] items-center justify-center rounded-xl bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-quartier-green" />
    </div>
  ),
});

// --- Typen ---

interface GpsPickerProps {
  lat: number | null;
  lng: number | null;
  locationText: string;
  onLocationChange: (lat: number, lng: number) => void;
  onTextChange: (text: string) => void;
}

// --- Hauptkomponente ---

export function GpsPicker({
  lat,
  lng,
  locationText,
  onLocationChange,
  onTextChange,
}: GpsPickerProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const hasCoords = lat !== null && lng !== null;

  // GPS-Position automatisch erkennen
  const handleAutoDetect = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Standortbestimmung wird von Ihrem Gerät nicht unterstützt.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        setMapOpen(true); // Karte oeffnen nach GPS-Erkennung
        toast.success("Standort erkannt.");
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Standort-Zugriff verweigert. Bitte erlauben Sie den Zugriff in den Einstellungen.",
          );
        } else {
          toast.error("Standort konnte nicht ermittelt werden.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onLocationChange]);

  return (
    <div className="space-y-3">
      {/* GPS-Button — Senior-Mode: min 80px Hoehe */}
      <button
        onClick={handleAutoDetect}
        disabled={locating}
        className="flex min-h-[80px] w-full items-center justify-center gap-3 rounded-xl bg-white p-4 shadow-soft transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
      >
        {locating ? (
          <Loader2 className="h-6 w-6 animate-spin text-quartier-green" />
        ) : (
          <Navigation className="h-6 w-6 text-quartier-green" />
        )}
        <span className="text-sm font-semibold text-anthrazit">
          {locating
            ? "Standort wird ermittelt ..."
            : hasCoords
              ? "Standort erkannt — erneut ermitteln"
              : "Aktuellen Standort verwenden"}
        </span>
      </button>

      {/* Koordinaten-Anzeige */}
      {hasCoords && (
        <div className="rounded-lg bg-quartier-green/5 p-3 text-xs text-quartier-green">
          <span className="font-medium">GPS-Koordinaten:</span>{" "}
          {lat!.toFixed(5)}, {lng!.toFixed(5)}
        </div>
      )}

      {/* Karte aufklappen / zuklappen */}
      <button
        onClick={() => setMapOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 shadow-soft transition-all hover:shadow-md"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-quartier-green" />
          <span className="text-sm font-medium text-anthrazit">
            {mapOpen ? "Karte ausblenden" : "Auf Karte wählen"}
          </span>
        </div>
        {mapOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Leaflet-Karte (aufklappbar) */}
      {mapOpen && (
        <div className="rounded-xl shadow-soft">
          <GpsPickerMap
            lat={lat}
            lng={lng}
            onLocationChange={onLocationChange}
          />
        </div>
      )}

      {/* Karten-Hinweis */}
      {mapOpen && (
        <p className="text-center text-xs text-muted-foreground">
          Tippen Sie auf die Karte oder ziehen Sie den Marker
        </p>
      )}

      {/* Ort-Beschreibung (Pflicht) */}
      <div>
        <label
          htmlFor="gps-picker-location-text"
          className="mb-1 block text-sm font-medium text-anthrazit"
        >
          Standort-Beschreibung *
        </label>
        <input
          id="gps-picker-location-text"
          type="text"
          value={locationText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="z. B. Vor Purkersdorfer Str. 12"
          maxLength={200}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </div>
    </div>
  );
}
