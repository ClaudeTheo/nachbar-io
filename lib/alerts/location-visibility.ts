export type LocationRole = "free" | "plus_family" | "pro" | "pro_medical";

interface AlertLocation {
  location_lat: number | null;
  location_lng: number | null;
  location_source: string | null;
}

interface LocationResult {
  lat: number;
  lng: number;
  exact: boolean;
  source: string;
}

export function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}

export function getLocationForRole(
  alert: AlertLocation,
  role: LocationRole,
  isConfirmedHelper: boolean,
): LocationResult | null {
  if (!alert.location_lat || !alert.location_lng || alert.location_source === "none") {
    return null;
  }

  if (role === "free") {
    return null;
  }

  if (role === "plus_family") {
    return {
      lat: alert.location_lat,
      lng: alert.location_lng,
      exact: true,
      source: alert.location_source ?? "gps",
    };
  }

  if (isConfirmedHelper) {
    return {
      lat: alert.location_lat,
      lng: alert.location_lng,
      exact: true,
      source: alert.location_source ?? "gps",
    };
  }

  const rounded = roundCoordinates(alert.location_lat, alert.location_lng);
  return {
    lat: rounded.lat,
    lng: rounded.lng,
    exact: false,
    source: alert.location_source ?? "gps",
  };
}
