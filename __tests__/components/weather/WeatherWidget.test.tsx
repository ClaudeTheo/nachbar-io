import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { WeatherWidget } from "@/components/weather/WeatherWidget";

describe("WeatherWidget", () => {
  afterEach(() => {
    cleanup();
  });

  const mockData = {
    temp: 18,
    description: "Sonnig",
    icon: "sun",
    forecast: [
      { day: "Di", icon: "sun", tempMax: 20 },
      { day: "Mi", icon: "cloud", tempMax: 16 },
      { day: "Do", icon: "rain", tempMax: 12 },
    ],
  };

  it("rendert Hero-Variante mit Temperatur", () => {
    render(<WeatherWidget variant="hero" {...mockData} />);
    expect(screen.getByText("18°")).toBeInTheDocument();
  });

  it("rendert Full-Variante mit Forecast", () => {
    render(<WeatherWidget variant="full" {...mockData} />);
    expect(screen.getByText("18°")).toBeInTheDocument();
    expect(screen.getByText("Di")).toBeInTheDocument();
    expect(screen.getByText("Mi")).toBeInTheDocument();
  });

  it("rendert Hero-Variante ohne Forecast", () => {
    render(<WeatherWidget variant="hero" {...mockData} />);
    expect(screen.queryByText("Di")).not.toBeInTheDocument();
  });

  it("zeigt Beschreibung an", () => {
    render(<WeatherWidget variant="full" {...mockData} />);
    expect(screen.getByText("Sonnig")).toBeInTheDocument();
  });
});
