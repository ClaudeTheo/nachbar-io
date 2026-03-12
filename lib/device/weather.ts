// Wetter-Daten von Open-Meteo API (kostenlos, kein API-Key, DSGVO-konform)

const BAD_SAECKINGEN_LAT = 47.5535;
const BAD_SAECKINGEN_LON = 7.9640;

export interface WeatherData {
  temp: number | null;
  icon: string;
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

export async function getWeather(): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${BAD_SAECKINGEN_LAT}&longitude=${BAD_SAECKINGEN_LON}&current=temperature_2m,weather_code&timezone=Europe/Berlin`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      console.error("[weather] Open-Meteo API Fehler:", res.status, res.statusText);
      return { temp: null, icon: "cloud" };
    }
    const data = await res.json();

    return {
      temp: Math.round(data.current.temperature_2m),
      icon: wmoToIcon(data.current.weather_code),
    };
  } catch (err) {
    console.error("[weather] Netzwerkfehler:", err);
    return { temp: null, icon: "cloud" };
  }
}
