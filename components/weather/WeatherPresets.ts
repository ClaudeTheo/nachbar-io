// Wetter-Gradient-Mappings und Farb-Helfer
// Extrahiert aus weather-demo WEATHER_PRESETS

export interface WeatherPreset {
  gradient: string;
  textColor: string;
  subColor: string;
}

const PRESETS: Record<string, WeatherPreset> = {
  sun: {
    gradient: "linear-gradient(180deg, #47ABDE 0%, #4A90D9 40%, #2171B5 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.7)",
  },
  "cloud-sun": {
    gradient: "linear-gradient(180deg, #8E9EAB 0%, #7B8D9E 40%, #636E78 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.65)",
  },
  cloud: {
    gradient: "linear-gradient(180deg, #8E9EAB 0%, #7B8D9E 40%, #636E78 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.65)",
  },
  rain: {
    gradient: "linear-gradient(180deg, #4B5563 0%, #57606B 35%, #3B4754 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.6)",
  },
  snow: {
    gradient: "linear-gradient(180deg, #B8C6DB 0%, #A8B8CC 40%, #8FA0B5 100%)",
    textColor: "#2D3142",
    subColor: "rgba(45,49,66,0.6)",
  },
  fog: {
    gradient: "linear-gradient(180deg, #8E9EAB 0%, #7B8D9E 40%, #636E78 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.65)",
  },
  storm: {
    gradient:
      "linear-gradient(180deg, #1a1a2e 0%, #2d2d44 30%, #3d3d5c 60%, #16213e 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.5)",
  },
  moon: {
    gradient:
      "linear-gradient(180deg, #0F1B2D 0%, #152238 40%, #1A2744 70%, #0D1520 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.5)",
  },
  sunset: {
    gradient:
      "linear-gradient(180deg, #2D1B69 0%, #B44593 30%, #F09819 65%, #FF512F 100%)",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.7)",
  },
};

// Fallback: Bewoelkt
const DEFAULT_PRESET: WeatherPreset = PRESETS.cloud;

/**
 * Mappe API-Icon-Strings auf CSS-Gradient
 */
export function getWeatherGradient(icon: string): string {
  return (PRESETS[icon] ?? DEFAULT_PRESET).gradient;
}

/**
 * Mappe API-Icon-Strings auf Text- und Sub-Farben
 */
export function getWeatherTextColors(icon: string): {
  text: string;
  sub: string;
} {
  const preset = PRESETS[icon] ?? DEFAULT_PRESET;
  return { text: preset.textColor, sub: preset.subColor };
}

/**
 * Bestimme ob ein Icon-Typ einen dunklen Hintergrund hat
 * (fuer Silhouetten-Rendering)
 */
export function isDarkWeather(icon: string): boolean {
  return icon === "moon" || icon === "storm" || icon === "rain";
}
