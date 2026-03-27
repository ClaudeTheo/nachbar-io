// Wetter-Daten fuer Kiosk/Device — delegiert an gemeinsamen Client
// Behaelt bestehende Schnittstelle bei (kein Breaking Change)

import { fetchWeather, wmoToIcon } from "../info/weather-client";

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

export { wmoToIcon };

export async function getWeather(): Promise<WeatherData> {
  const result = await fetchWeather();
  return {
    temp: result.temp,
    icon: result.icon,
    forecast: result.forecast,
  };
}
