// Wetter-Daten von Open-Meteo API (kostenlos, kein API-Key, DSGVO-konform)
// Gemeinsamer Client fuer Web-App und Kiosk

import type { QuartierWeather, QuartierWeatherDay } from "./types";

const DEFAULT_LAT = 47.5535;
const DEFAULT_LON = 7.9640;

// Deutsche Wochentags-Kuerzel (Index 0 = Sonntag)
const DAY_NAMES_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

// WMO Wettercode → deutsches Label
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Klar",
  1: "Überwiegend klar",
  2: "Teilweise bewölkt",
  3: "Bewölkt",
  45: "Nebel",
  48: "Nebel mit Reif",
  51: "Leichter Nieselregen",
  53: "Nieselregen",
  55: "Starker Nieselregen",
  61: "Leichter Regen",
  63: "Regen",
  65: "Starker Regen",
  71: "Leichter Schneefall",
  73: "Schneefall",
  75: "Starker Schneefall",
  80: "Regenschauer",
  81: "Starke Regenschauer",
  95: "Gewitter",
  96: "Gewitter mit Hagel",
};

// WMO Wettercode → einfaches Icon Mapping
export function wmoToIcon(code: number): string {
  if (code === 0 || code === 1) return "sun";
  if (code === 2 || code === 3) return "cloud";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}

function wmoToDescription(code: number): string {
  // Exakter Match
  if (WMO_DESCRIPTIONS[code]) return WMO_DESCRIPTIONS[code];
  // Bereichs-Fallback
  if (code >= 45 && code <= 48) return "Nebel";
  if (code >= 51 && code <= 55) return "Nieselregen";
  if (code >= 56 && code <= 57) return "Gefrierender Nieselregen";
  if (code >= 61 && code <= 65) return "Regen";
  if (code >= 66 && code <= 67) return "Gefrierender Regen";
  if (code >= 71 && code <= 77) return "Schneefall";
  if (code >= 80 && code <= 82) return "Regenschauer";
  if (code >= 85 && code <= 86) return "Schneeschauer";
  if (code >= 95) return "Gewitter";
  return "Bewölkt";
}

// Datum-String (YYYY-MM-DD) → deutscher Wochentags-Kuerzel
function dateToDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return DAY_NAMES_DE[date.getDay()];
}

/**
 * Holt aktuelle Wetterdaten + 3-Tage-Vorhersage von Open-Meteo
 * @param lat Breitengrad (Default: Bad Saeckingen)
 * @param lon Laengengrad (Default: Bad Saeckingen)
 */
export async function fetchWeather(
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON
): Promise<QuartierWeather> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,weather_code&forecast_days=4&timezone=Europe/Berlin`;
    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (!res.ok) {
      console.error("[weather] Open-Meteo API Fehler:", res.status, res.statusText);
      return { temp: null, icon: "cloud", description: "Nicht verfügbar", forecast: [] };
    }

    const data = await res.json();

    // 3-Tage-Vorhersage: Index 0 = heute ueberspringen, nur Folgetage 1-3
    const forecast: QuartierWeatherDay[] = [];
    if (data.daily?.time && data.daily?.temperature_2m_max && data.daily?.weather_code) {
      for (let i = 1; i <= 3 && i < data.daily.time.length; i++) {
        forecast.push({
          day: dateToDayName(data.daily.time[i]),
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          icon: wmoToIcon(data.daily.weather_code[i]),
        });
      }
    }

    const weatherCode = data.current.weather_code;

    return {
      temp: Math.round(data.current.temperature_2m),
      icon: wmoToIcon(weatherCode),
      description: wmoToDescription(weatherCode),
      forecast,
    };
  } catch (err) {
    console.error("[weather] Netzwerkfehler:", err);
    return { temp: null, icon: "cloud", description: "Nicht verfügbar", forecast: [] };
  }
}
