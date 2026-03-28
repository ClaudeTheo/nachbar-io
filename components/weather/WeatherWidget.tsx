"use client";

// WeatherWidget — Wiederverwendbare Komponente mit Hero- und Full-Variante
// Extrahiert aus weather-demo/page.tsx

import { AnimatedWeatherIcon } from "./AnimatedWeatherIcon";
import { SkylineSilhouette } from "./SkylineSilhouette";
import {
  getWeatherGradient,
  getWeatherTextColors,
  isDarkWeather,
} from "./WeatherPresets";

interface WeatherWidgetProps {
  variant: "hero" | "full";
  temp: number | null;
  description: string;
  icon: string;
  forecast?: { day: string; icon: string; tempMax: number }[];
}

export function WeatherWidget({
  variant,
  temp,
  description,
  icon,
  forecast,
}: WeatherWidgetProps) {
  const gradient = getWeatherGradient(icon);
  const colors = getWeatherTextColors(icon);
  const isDark = isDarkWeather(icon);

  if (variant === "hero") {
    return (
      <HeroVariant
        gradient={gradient}
        colors={colors}
        isDark={isDark}
        temp={temp}
        description={description}
        icon={icon}
      />
    );
  }

  return (
    <FullVariant
      gradient={gradient}
      colors={colors}
      isDark={isDark}
      temp={temp}
      description={description}
      icon={icon}
      forecast={forecast}
    />
  );
}

// ── Hero-Variante (kompakt, fuer Dashboard-Hintergrund) ──
function HeroVariant({
  gradient,
  colors,
  isDark,
  temp,
  description,
  icon,
}: {
  gradient: string;
  colors: { text: string; sub: string };
  isDark: boolean;
  temp: number | null;
  description: string;
  icon: string;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: gradient }}
    >
      <SkylineSilhouette opacity={isDark ? 0.15 : 0.1} />

      <div className="relative z-10 h-full flex items-center justify-between p-4">
        <div>
          <span
            className="font-extralight tracking-tighter leading-none block"
            style={{ color: colors.text, fontSize: 48 }}
          >
            {temp !== null ? `${temp}°` : "--°"}
          </span>
          <p className="text-sm mt-1" style={{ color: colors.sub }}>
            {description}
          </p>
        </div>
        <AnimatedWeatherIcon icon={icon} size={56} />
      </div>

      <WeatherAnimationStyles />
    </div>
  );
}

// ── Full-Variante (fuer Quartier-Info-Seite) ──
function FullVariant({
  gradient,
  colors,
  isDark,
  temp,
  description,
  icon,
  forecast,
}: {
  gradient: string;
  colors: { text: string; sub: string };
  isDark: boolean;
  temp: number | null;
  description: string;
  icon: string;
  forecast?: { day: string; icon: string; tempMax: number }[];
}) {
  return (
    <div
      className="relative overflow-hidden shadow-lg"
      style={{
        background: gradient,
        borderRadius: 16,
      }}
    >
      <SkylineSilhouette opacity={isDark ? 0.15 : 0.1} />

      {/* Hauptinhalt */}
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <span
              className="font-extralight tracking-tighter leading-none block"
              style={{ color: colors.text, fontSize: 52 }}
            >
              {temp !== null ? `${temp}°` : "--°"}
            </span>
            <p className="text-sm mt-1" style={{ color: colors.sub }}>
              {description}
            </p>
          </div>
          <AnimatedWeatherIcon icon={icon} size={64} />
        </div>

        {/* 3-Tage Forecast */}
        {forecast && forecast.length > 0 && (
          <div
            className="flex gap-4 mt-4 pt-3"
            style={{
              borderTop: `1px solid ${colors.sub.replace(/[\d.]+\)$/, "0.2)")}`,
            }}
          >
            {forecast.map((day) => (
              <div key={day.day} className="flex items-center gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: colors.sub }}
                >
                  {day.day}
                </span>
                <AnimatedWeatherIcon icon={day.icon} size={18} />
                <span
                  className="text-xs font-semibold"
                  style={{ color: colors.text }}
                >
                  {day.tempMax}°
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <WeatherAnimationStyles />
    </div>
  );
}

// ── Globale CSS-Animationen (nur einmal rendern) ──
function WeatherAnimationStyles() {
  return (
    <style jsx global>{`
      @keyframes float {
        0%,
        100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-4px);
        }
      }

      @keyframes rainDrop {
        0% {
          opacity: 0.8;
          transform: translateY(-6px);
        }
        100% {
          opacity: 0;
          transform: translateY(14px);
        }
      }

      @keyframes snowFall {
        0% {
          opacity: 0.9;
          transform: translateY(-6px) translateX(0);
        }
        33% {
          transform: translateY(4px) translateX(4px);
        }
        66% {
          transform: translateY(10px) translateX(-2px);
        }
        100% {
          opacity: 0;
          transform: translateY(16px) translateX(1px);
        }
      }

      @keyframes twinkle {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.2;
          transform: scale(0.6);
        }
      }

      @keyframes flash {
        0%,
        85%,
        100% {
          opacity: 0;
        }
        87%,
        93% {
          opacity: 1;
        }
        89% {
          opacity: 0.2;
        }
        91% {
          opacity: 0;
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 0.6;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes waveShift {
        0%,
        100% {
          transform: translateX(0);
        }
        50% {
          transform: translateX(-8px);
        }
      }
    `}</style>
  );
}
