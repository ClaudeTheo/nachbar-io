// Wetter-Daten von Open-Meteo API (kostenlos, kein API-Key, DSGVO-konform)

const DEFAULT_LAT = 47.5535;
const DEFAULT_LON = 7.9640;

// Deutsche Wochentags-Kuerzel (Index 0 = Sonntag)
const DAY_NAMES_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

export interface WeatherDay {
  day: string;     // Deutscher Kurzname: "Mo", "Di", "Mi", ...
  tempMax: number; // Tageshöchsttemperatur in °C (gerundet)
  icon: string;    // Icon-Schluessel (sun/cloud/rain/snow/fog/storm)
}

export interface WeatherData {
  temp: number | null;
  icon: string;
  forecast: WeatherDay[];
}

// WMO Wettercode → einfaches Icon Mapping
function wmoToIcon(code: number): string {
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

// Datum-String (YYYY-MM-DD) → deutscher Wochentags-Kuerzel
function dateToDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return DAY_NAMES_DE[date.getDay()];
}

export async function getWeather(): Promise<WeatherData> {
  try {
    // Aktuelles Wetter + 4 Tage Vorhersage (heute + 3 Folgetage)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}&current=temperature_2m,weather_code&daily=temperature_2m_max,weather_code&forecast_days=4&timezone=Europe/Berlin`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      console.error("[weather] Open-Meteo API Fehler:", res.status, res.statusText);
      return { temp: null, icon: "cloud", forecast: [] };
    }
    const data = await res.json();

    // 3-Tage-Vorhersage: Index 0 = heute ueberspringen, nur Folgetage 1-3
    const forecast: WeatherDay[] = [];
    if (data.daily?.time && data.daily?.temperature_2m_max && data.daily?.weather_code) {
      for (let i = 1; i <= 3 && i < data.daily.time.length; i++) {
        forecast.push({
          day: dateToDayName(data.daily.time[i]),
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          icon: wmoToIcon(data.daily.weather_code[i]),
        });
      }
    }

    return {
      temp: Math.round(data.current.temperature_2m),
      icon: wmoToIcon(data.current.weather_code),
      forecast,
    };
  } catch (err) {
    console.error("[weather] Netzwerkfehler:", err);
    return { temp: null, icon: "cloud", forecast: [] };
  }
}
