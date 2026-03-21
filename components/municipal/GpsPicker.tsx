"use client";

// GPS-Picker — Standortauswahl mit GPS-Erkennung + Textfeld
// Zeigt nach GPS-Erkennung einen Link zur OpenStreetMap-Karte

import { useState, useCallback } from "react";
import { MapPin, Loader2, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { isLocationDisclosed, markLocationDisclosed } from "@/components/permissions/LocationDisclosure";
import { LocationDisclosure } from "@/components/permissions/LocationDisclosure";

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
  const [locating, setLocating] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const hasCoords = lat !== null && lng !== null;

  // GPS-Position tatsaechlich abrufen (nach Disclosure)
  const fetchGps = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Standortbestimmung wird von Ihrem Gerät nicht unterstützt.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
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

  // GPS-Position mit Prominent Disclosure (Google Play Policy)
  const handleAutoDetect = useCallback(() => {
    if (!isLocationDisclosed("report")) {
      setShowDisclosure(true);
      return;
    }
    fetchGps();
  }, [fetchGps]);

  // OpenStreetMap-Link generieren
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat!.toFixed(5)}&mlon=${lng!.toFixed(5)}#map=17/${lat!.toFixed(5)}/${lng!.toFixed(5)}`
    : null;

  return (
    <div className="space-y-3">
      {/* Google Play Prominent Disclosure */}
      {showDisclosure && (
        <LocationDisclosure
          purpose="report"
          onAccept={() => {
            setShowDisclosure(false);
            fetchGps();
          }}
          onDecline={() => {
            setShowDisclosure(false);
            toast.info("Standortbestimmung wurde abgelehnt.");
          }}
        />
      )}

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

      {/* Koordinaten + Karten-Link */}
      {hasCoords && (
        <div className="rounded-xl bg-quartier-green/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-quartier-green">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">
              {lat!.toFixed(5)}, {lng!.toFixed(5)}
            </span>
          </div>
          {osmUrl && (
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-quartier-green underline underline-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Auf OpenStreetMap anzeigen
            </a>
          )}
        </div>
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
