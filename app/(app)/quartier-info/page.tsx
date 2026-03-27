"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  CloudFog,
  CloudLightning,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  FileText,
  Landmark,
  Calendar,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuarter } from "@/lib/quarters";
import type {
  QuartierInfoResponse,
  QuartierWeatherDay,
  RathausLink,
  NinaWarning,
  WasteNext,
} from "@/lib/info/types";

// Wetter-Icon Mapping
function WeatherIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    sun: <Sun className={className} />,
    cloud: <Cloud className={className} />,
    rain: <CloudRain className={className} />,
    snow: <Snowflake className={className} />,
    fog: <CloudFog className={className} />,
    storm: <CloudLightning className={className} />,
  };
  return <>{icons[icon] || icons.cloud}</>;
}

// Pollen-Balken (farbig)
function PollenBar({ intensity, label }: { intensity: number; label: string }) {
  const pct = (intensity / 3) * 100;
  const color =
    intensity >= 2.5
      ? "bg-red-500"
      : intensity >= 1.5
        ? "bg-amber-500"
        : intensity >= 0.5
          ? "bg-green-500"
          : "bg-gray-200";

  const levelText =
    intensity === 0
      ? "Keine"
      : intensity <= 1
        ? "Gering"
        : intensity <= 2
          ? "Mittel"
          : "Hoch";

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-anthrazit truncate">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span className="w-12 text-xs text-muted-foreground text-right">
        {levelText}
      </span>
    </div>
  );
}

// Datum formatieren (deutsch)
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Dynamisches Lucide-Icon
function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "alert-triangle": AlertTriangle,
    "file-text": FileText,
    landmark: Landmark,
    calendar: Calendar,
    "heart-handshake": HeartHandshake,
    "shield-check": ShieldCheck,
  };
  const Icon = IconMap[name] || Cloud;
  return <Icon className={className} />;
}

export default function QuartierInfoPage() {
  const { currentQuarter } = useQuarter();
  const quarterId = currentQuarter?.id;
  const [data, setData] = useState<QuartierInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!quarterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quartier-info?quarter_id=${quarterId}`);
      const d = await res.json();
      setData(d);
    } catch {
      // Fehler still ignorieren
    } finally {
      setLoading(false);
    }
  }, [quarterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 pb-24 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-anthrazit" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Quartier-Info</h1>
        <button
          onClick={loadData}
          className="ml-auto p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Daten aktualisieren"
        >
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* 1. Wetter */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-weather"
      >
        <h2 className="text-base font-semibold text-anthrazit mb-3">Wetter</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data?.weather ? (
          <div>
            {/* Aktuell */}
            <div className="flex items-center gap-4 mb-4">
              <WeatherIcon
                icon={data.weather.icon}
                className="h-10 w-10 text-amber-500"
              />
              <div>
                <span className="text-3xl font-bold text-anthrazit">
                  {data.weather.temp !== null ? `${data.weather.temp}°C` : "–"}
                </span>
                <p className="text-sm text-muted-foreground">
                  {data.weather.description}
                </p>
              </div>
            </div>
            {/* 3-Tage-Forecast */}
            {data.weather.forecast.length > 0 && (
              <div className="flex gap-4 border-t border-gray-100 pt-3">
                {data.weather.forecast.map((day: QuartierWeatherDay) => (
                  <div key={day.day} className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground">{day.day}</p>
                    <WeatherIcon
                      icon={day.icon}
                      className="h-5 w-5 mx-auto my-1 text-gray-500"
                    />
                    <p className="text-sm font-medium text-anthrazit">
                      {day.tempMax}°
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Wetterdaten nicht verfügbar
          </p>
        )}
      </section>

      {/* 2. Pollenflug */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-pollen"
      >
        <h2 className="text-base font-semibold text-anthrazit mb-3">
          Pollenflug
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : data?.pollen ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Region: {data.pollen.region} — Heute
            </p>
            {Object.entries(data.pollen.pollen).map(([name, val]) => (
              <PollenBar key={name} label={name} intensity={val.today} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pollendaten nicht verfügbar
          </p>
        )}
      </section>

      {/* 3. Warnungen */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        id="warnungen"
        data-testid="info-warnungen"
      >
        <h2 className="text-base font-semibold text-anthrazit mb-3">
          Warnungen
        </h2>
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : data?.nina && data.nina.length > 0 ? (
          <div className="space-y-3">
            {data.nina.map((w: NinaWarning) => {
              const isHigh =
                w.severity === "Extreme" || w.severity === "Severe";
              return (
                <div
                  key={w.warning_id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    isHigh
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isHigh ? "text-red-600" : "text-amber-600"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${isHigh ? "text-red-900" : "text-amber-900"}`}
                    >
                      {w.headline}
                    </p>
                    {w.description && (
                      <p
                        className={`text-xs mt-1 ${isHigh ? "text-red-800" : "text-amber-800"}`}
                      >
                        {w.description.slice(0, 300)}
                        {w.description.length > 300 ? "…" : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm">Keine aktiven Warnungen</span>
          </div>
        )}
      </section>

      {/* 4. Naechste Abfuhr */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-waste"
      >
        <h2 className="text-base font-semibold text-anthrazit mb-3">
          Nächste Abfuhr
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data?.waste_next && data.waste_next.length > 0 ? (
          <div className="space-y-2">
            {data.waste_next.map((w: WasteNext, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-anthrazit">
                  {formatDate(w.date)}
                </span>
                <span className="text-sm text-muted-foreground">{w.label}</span>
              </div>
            ))}
            <Link
              href="/waste-calendar"
              className="text-xs text-quartier-green hover:underline mt-2 inline-block"
            >
              Zum Müllkalender →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keine Termine verfügbar
          </p>
        )}
      </section>

      {/* 5. Rathaus & Services */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-rathaus"
      >
        <h2 className="text-base font-semibold text-anthrazit mb-3">
          Rathaus & Services
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {data?.rathaus?.map((link: RathausLink) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors min-h-[80px]"
              >
                <div className="flex items-center gap-2">
                  <DynamicIcon
                    name={link.icon}
                    className="h-4 w-4 text-quartier-green"
                  />
                  <span className="text-sm font-medium text-anthrazit">
                    {link.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {link.description}
                </p>
                <ExternalLink className="h-3 w-3 text-muted-foreground mt-auto self-end" />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
