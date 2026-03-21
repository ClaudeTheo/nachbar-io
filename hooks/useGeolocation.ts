"use client";

import { useState, useCallback } from "react";
import type { LocationPurpose } from "@/components/permissions/LocationDisclosure";
import { isLocationDisclosed, markLocationDisclosed } from "@/components/permissions/LocationDisclosure";

interface GeoPosition {
  lat: number;
  lng: number;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  loading: boolean;
  error: string | null;
  /** true wenn Prominent Disclosure angezeigt werden muss (Google Play Policy) */
  needsDisclosure: boolean;
  /** Disclosure akzeptieren und Standort anfordern */
  acceptDisclosure: () => void;
  /** Disclosure ablehnen */
  declineDisclosure: () => void;
  /** Standort direkt anfordern (nur wenn Disclosure bereits akzeptiert) */
  requestPosition: () => Promise<GeoPosition | null>;
}

export function useGeolocation(purpose: LocationPurpose = "map"): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsDisclosure, setNeedsDisclosure] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);

  const fetchPosition = useCallback(async (): Promise<GeoPosition | null> => {
    if (!navigator.geolocation) {
      setError("GPS wird von Ihrem Browser nicht unterstützt");
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geo: GeoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setPosition(geo);
          setLoading(false);
          resolve(geo);
        },
        (err) => {
          const msg = err.code === 1
            ? "GPS-Zugriff verweigert"
            : err.code === 2
              ? "GPS-Position nicht verfügbar"
              : "GPS-Zeitüberschreitung";
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }, []);

  const requestPosition = useCallback(async (): Promise<GeoPosition | null> => {
    // Google Play Prominent Disclosure: Pruefen ob bereits akzeptiert
    if (!isLocationDisclosed(purpose)) {
      setNeedsDisclosure(true);
      setPendingRequest(true);
      return null;
    }
    return fetchPosition();
  }, [purpose, fetchPosition]);

  const acceptDisclosure = useCallback(() => {
    markLocationDisclosed(purpose);
    setNeedsDisclosure(false);
    if (pendingRequest) {
      setPendingRequest(false);
      fetchPosition();
    }
  }, [purpose, pendingRequest, fetchPosition]);

  const declineDisclosure = useCallback(() => {
    setNeedsDisclosure(false);
    setPendingRequest(false);
    setError("Standortzugriff abgelehnt");
  }, []);

  return {
    position,
    loading,
    error,
    needsDisclosure,
    acceptDisclosure,
    declineDisclosure,
    requestPosition,
  };
}
