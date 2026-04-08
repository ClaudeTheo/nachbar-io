// lib/geo/haversine.ts
// Nachbar.io — Haversine-Formel: Distanz zwischen zwei GPS-Punkten in Kilometern

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Berechnet die Distanz zwischen zwei Koordinaten in km (gerundet auf 1 Dezimalstelle).
 * Verwendet die Haversine-Formel fuer grosse Kreise auf der Erdkugel.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Erdradius in Kilometern
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
