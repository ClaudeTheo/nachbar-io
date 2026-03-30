// GET /api/device/weather — Wetterdaten fuer Kiosk-Terminal
// Kein Device-Auth noetig (oeffentliche Wetterdaten, kein Personenbezug)

import { NextResponse } from "next/server";
import { fetchWeather } from "@/modules/info-hub/services/weather-client";

export async function GET() {
  try {
    const weather = await fetchWeather();

    // Format fuer Kiosk-Frontend (dashboard.js erwartet dieses Schema)
    return NextResponse.json({
      temp: weather.temp,
      description: weather.description,
      humidity: null,
      wind_speed: null,
      forecast: weather.forecast.map((day) => ({
        day: day.day,
        temp_max: day.tempMax,
        condition: weather.description,
      })),
    });
  } catch {
    return NextResponse.json(
      { temp: null, description: "Nicht verfuegbar", forecast: [] },
      { status: 500 },
    );
  }
}
