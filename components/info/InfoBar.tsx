"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  CloudFog,
  CloudLightning,
  Trash2,
  Train,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuarter } from "@/lib/quarters";
import type { QuartierInfoResponse } from "@/lib/info/types";

// Wetter-Icon Mapping
const WEATHER_ICONS: Record<string, React.ReactNode> = {
  sun: <Sun className="h-5 w-5 text-amber-500" />,
  cloud: <Cloud className="h-5 w-5 text-gray-500" />,
  rain: <CloudRain className="h-5 w-5 text-blue-500" />,
  snow: <Snowflake className="h-5 w-5 text-blue-300" />,
  fog: <CloudFog className="h-5 w-5 text-gray-400" />,
  storm: <CloudLightning className="h-5 w-5 text-purple-500" />,
};

// Pollen-Dots: Belastungsstufe als farbige Punkte
function PollenDots({ intensity }: { intensity: number }) {
  const filled = Math.round(intensity);
  return (
    <span
      className="inline-flex gap-0.5"
      aria-label={`Belastung ${intensity} von 3`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i <= filled
              ? intensity >= 2.5
                ? "bg-red-500"
                : intensity >= 1.5
                  ? "bg-amber-500"
                  : "bg-green-500"
              : "bg-gray-200"
          }`}
        />
      ))}
    </span>
  );
}

// Naechste Abfuhr-Datum formatieren
function formatWasteDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return dayNames[date.getDay()];
}

export function InfoBar() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const quarterId = currentQuarter?.id;
  const [data, setData] = useState<QuartierInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quarterId) return;

    fetch(`/api/quartier-info?quarter_id=${quarterId}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [quarterId]);

  if (loading) {
    return (
      <div
        className="flex items-center gap-4 rounded-xl bg-white/80 backdrop-blur px-4 py-3 shadow-sm"
        data-testid="info-bar-skeleton"
      >
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20 ml-auto" />
      </div>
    );
  }

  if (!data) return null;

  // Top-2 Pollen mit hoechster Belastung
  const topPollen = data.pollen
    ? Object.entries(data.pollen.pollen)
        .sort(([, a], [, b]) => b.today - a.today)
        .slice(0, 2)
        .filter(([, v]) => v.today > 0)
    : [];

  const nextWaste = data.waste_next?.[0];

  return (
    <button
      onClick={() => router.push("/quartier-info")}
      className="flex items-center gap-4 rounded-xl bg-white/80 backdrop-blur px-4 py-3 shadow-sm w-full text-left min-h-[48px] hover:bg-white/90 transition-colors"
      data-testid="info-bar"
      aria-label="Quartier-Informationen öffnen"
    >
      {/* Wetter */}
      {data.weather && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-anthrazit">
          {WEATHER_ICONS[data.weather.icon] || WEATHER_ICONS.cloud}
          <span>
            {data.weather.temp !== null ? `${data.weather.temp}°` : "–"}
          </span>
        </div>
      )}

      {/* Pollen */}
      {topPollen.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {topPollen.map(([name, val]) => (
            <span key={name} className="flex items-center gap-1">
              <span>{name}</span>
              <PollenDots intensity={val.today} />
            </span>
          ))}
        </div>
      )}

      {/* ÖPNV naechste Abfahrt */}
      {data.oepnv?.[0]?.departures?.[0] && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Train className="h-3.5 w-3.5 text-blue-600" />
          <span>{data.oepnv[0].departures[0].countdown} Min</span>
        </div>
      )}

      {/* Naechste Muellabfuhr */}
      {nextWaste && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <Trash2 className="h-3.5 w-3.5" />
          <span>{formatWasteDate(nextWaste.date)}</span>
          <span className="truncate max-w-[60px]">{nextWaste.label}</span>
        </div>
      )}
    </button>
  );
}
