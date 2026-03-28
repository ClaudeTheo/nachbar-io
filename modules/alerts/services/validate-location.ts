type ValidSource = "gps" | "household" | "none";
const VALID_SOURCES: ValidSource[] = ["gps", "household", "none"];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Standort-Daten validieren bevor sie in der Datenbank gespeichert werden
export function validateLocationData(
  lat: number | null | undefined,
  lng: number | null | undefined,
  source: string | null | undefined,
): ValidationResult {
  if (source && !VALID_SOURCES.includes(source as ValidSource)) {
    return { valid: false, error: "Ungültige Standort-Quelle" };
  }

  if (!source || source === "none") {
    return { valid: true };
  }

  if (lat == null || lng == null) {
    return { valid: false, error: "Koordinaten fehlen" };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: "Latitude muss zwischen -90 und 90 liegen" };
  }

  if (lng < -180 || lng > 180) {
    return {
      valid: false,
      error: "Longitude muss zwischen -180 und 180 liegen",
    };
  }

  return { valid: true };
}
