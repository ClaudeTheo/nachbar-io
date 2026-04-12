"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Cloud,
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
  Train,
  Pill,
  Phone,
  ShoppingBag,
  Clock,
  MapPin,
} from "lucide-react";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuarter } from "@/lib/quarters";
import { TTSButton } from "@/modules/voice/components/companion/TTSButton";
import { buildDailyBrief } from "@/modules/voice/services/daily-brief.service";
import type {
  QuartierInfoResponse,
  RathausLink,
  NinaWarning,
  WasteNext,
  OepnvStop,
  OepnvDeparture,
  Apotheke,
  LocalEvent,
} from "@/modules/info-hub/types";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { MapThumbnail } from "@/components/map/MapThumbnail";

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
    "shopping-bag": ShoppingBag,
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
      <LargeTitle title="Mein Quartier" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-anthrazit" />
        </Link>
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

      {/* Vorlesen-Button (G-5) */}
      {!loading && data && (
        <section data-testid="info-vorlesen">
          <TTSButton text={buildDailyBrief(data)} />
        </section>
      )}

      {/* 1. Wetter */}
      <section data-testid="info-weather">
        {loading ? (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data?.weather ? (
          <WeatherWidget
            variant="full"
            temp={data.weather.temp}
            description={data.weather.description}
            icon={data.weather.icon}
            forecast={data.weather.forecast}
          />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-anthrazit mb-3">
              Wetter
            </h2>
            <p className="text-sm text-muted-foreground">
              Wetterdaten nicht verfügbar
            </p>
          </div>
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

      {/* 5. ÖPNV-Abfahrten */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-oepnv"
      >
        <div className="flex items-center gap-2 mb-3">
          <Train className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-anthrazit">
            Nächste Abfahrten
          </h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data?.oepnv && data.oepnv.length > 0 ? (
          <div className="space-y-4">
            {data.oepnv.map((stop: OepnvStop) => (
              <div key={stop.id}>
                <p className="text-xs text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {stop.name}
                </p>
                <div className="space-y-1">
                  {stop.departures
                    .slice(0, 8)
                    .map((dep: OepnvDeparture, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                      >
                        <span className="w-12 text-sm font-mono font-semibold text-anthrazit">
                          {dep.time}
                        </span>
                        <span className="w-16 text-xs font-medium text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 text-center">
                          {dep.line}
                        </span>
                        <span className="flex-1 text-sm text-anthrazit truncate">
                          {dep.destination}
                        </span>
                        {dep.platform && (
                          <span className="text-xs text-muted-foreground">
                            Gl. {dep.platform}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keine Abfahrten verfügbar
          </p>
        )}
      </section>

      {/* 5b. Karten-Thumbnail (G-4) */}
      {currentQuarter && (
        <section data-testid="info-map">
          <MapThumbnail
            lat={currentQuarter.center_lat}
            lng={currentQuarter.center_lng}
            zoom={currentQuarter.zoom_level}
            label={`${currentQuarter.name} — Karte`}
          />
        </section>
      )}

      {/* 6. Apotheken */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-apotheken"
      >
        <div className="flex items-center gap-2 mb-3">
          <Pill className="h-5 w-5 text-green-600" />
          <h2 className="text-base font-semibold text-anthrazit">Apotheken</h2>
        </div>
        <div className="space-y-3">
          {(data?.apotheken || []).map((apo: Apotheke) => (
            <div
              key={apo.name}
              className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-anthrazit">{apo.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {apo.address}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {apo.openingHours}
                  </span>
                </div>
              </div>
              <a
                href={`tel:${apo.phone.replace(/\s/g, "")}`}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50 hover:bg-green-100 transition-colors flex-shrink-0"
                aria-label={`${apo.name} anrufen`}
              >
                <Phone className="h-4 w-4 text-green-700" />
              </a>
            </div>
          ))}
        </div>
        <a
          href={data?.notdienst_url || ""}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium text-sm hover:bg-amber-100 transition-colors min-h-[48px]"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Notdienst jetzt prüfen
          <ExternalLink className="h-3 w-3 text-amber-600" />
        </a>
      </section>

      {/* 7. Veranstaltungen */}
      <section
        className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
        data-testid="info-events"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h2 className="text-base font-semibold text-anthrazit">
            Veranstaltungen
          </h2>
        </div>
        <div className="space-y-3">
          {(data?.events || []).map((evt: LocalEvent, i: number) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-100 p-4"
            >
              <DynamicIcon
                name={evt.icon}
                className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-anthrazit">
                  {evt.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {evt.schedule}
                </p>
                <p className="text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-0.5" />
                  {evt.location}
                </p>
              </div>
            </div>
          ))}
        </div>
        <a
          href={data?.events_calendar_url || ""}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-quartier-green hover:underline inline-flex items-center gap-1"
        >
          Alle Veranstaltungen anzeigen
          <ExternalLink className="h-3 w-3" />
        </a>
      </section>

      {/* 8. Rathaus & Services */}
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
