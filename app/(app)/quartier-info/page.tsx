"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Cloud,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RefreshCw,
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
  Plus,
} from "lucide-react";
import { MagazineHeader } from "@/components/brand/MagazineHeader";
import { QuartierAppLogo } from "@/components/brand/QuartierAppLogo";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalWarningBanner } from "@/components/warnings/external-warning-banner";
import { useQuarter } from "@/lib/quarters";
import { TTSButton } from "@/modules/voice/components/companion/TTSButton";
import { buildDailyBrief } from "@/modules/voice/services/daily-brief.service";
import { normalizeQuartierInfoResponse } from "@/modules/info-hub/normalize-response";
import type {
  QuartierInfoResponse,
  RathausLink,
  WasteNext,
  OepnvStop,
  OepnvDeparture,
  Apotheke,
  LocalEvent,
} from "@/modules/info-hub/types";
import { MapThumbnail } from "@/components/map/MapThumbnail";
import { useMapStatuses } from "@/lib/hooks/useMapStatuses";
import { ExternalLink as SafeExternalLink } from "@/components/ExternalLink";

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
      <div className="flex-1 h-3 bg-anthrazit-tint rounded-full overflow-hidden">
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

function buildApothekeMapUrl(apo: Apotheke): string {
  const query = [apo.name, apo.address].filter(Boolean).join(" ");

  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
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

type QuartierInfoErrorBody = {
  error?: string;
  status?: string;
};

function getQuartierInfoErrorMessage(
  responseStatus: number,
  body: unknown,
): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as QuartierInfoErrorBody).error === "string"
  ) {
    return (body as QuartierInfoErrorBody).error ?? "";
  }

  return `Quartierdaten konnten nicht geladen werden (HTTP ${responseStatus}).`;
}

export default function QuartierInfoPage() {
  const {
    currentQuarter,
    loading: quarterLoading,
    refreshQuarter,
  } = useQuarter();
  const quarterId = currentQuarter?.id;
  const { geoHouses, residentCounts } = useMapStatuses(
    quarterId,
    currentQuarter?.map_config,
    currentQuarter?.center_lat,
    currentQuarter?.center_lng,
  );
  const [data, setData] = useState<QuartierInfoResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const pageShellClass =
    "space-y-6 pb-24 animate-fade-in-up lg:relative lg:left-1/2 lg:w-[min(calc(100vw-4rem),960px)] lg:-translate-x-1/2 lg:space-y-8";

  const loadData = useCallback(async () => {
    if (!quarterId) {
      setData(null);
      setApiError(null);
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/quartier-info?quarter_id=${quarterId}`);
      const d = await res.json();
      if (!res.ok) {
        setData(null);
        setApiError(getQuartierInfoErrorMessage(res.status, d));
        return;
      }
      setData(normalizeQuartierInfoResponse(d));
    } catch {
      setData(null);
      setApiError("Quartierdaten konnten gerade nicht geladen werden.");
    } finally {
      setLoadingData(false);
    }
  }, [quarterId]);

  useEffect(() => {
    if (quarterLoading) return;
    loadData();
  }, [quarterLoading, loadData]);

  const handleRefresh = useCallback(async () => {
    if (!quarterId) {
      await refreshQuarter();
      return;
    }

    await loadData();
  }, [loadData, quarterId, refreshQuarter]);

  const loading = quarterLoading || loadingData;
  const hasNotdienstUrl = Boolean(data?.notdienst_url);
  const hasEventsCalendarUrl = Boolean(data?.events_calendar_url);
  const previewPoints = useMemo(
    () =>
      geoHouses
        .filter((house) => residentCounts[house.id] > 0)
        .map((house) => ({ lat: house.lat, lng: house.lng })),
    [geoHouses, residentCounts],
  );

  // Visual-Polish v7: Magazin-Hero plus Refresh-Action (3x rendered je nach
  // Branch). Local helper damit derselbe Header in No-Quarter, Error und
  // Main-Branch DRY bleibt.
  const quartierName = (currentQuarter?.name ?? currentQuarter?.city ?? "Ihr Quartier").toUpperCase();
  const refreshAction = (
    <button
      onClick={handleRefresh}
      className="rounded-full p-2 transition-colors hover:bg-anthrazit-tint min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label="Daten aktualisieren"
    >
      <RefreshCw
        className={`h-5 w-5 text-anthrazit-light ${loading ? "animate-spin" : ""}`}
      />
    </button>
  );

  if (!quarterLoading && !currentQuarter) {
    return (
      <div className={pageShellClass}>
        <MagazineHeader
          eyebrow="QUARTIER · KEINE ZUORDNUNG"
          title="Quartier-Info"
          backHref="/dashboard"
          backLabel="Zurück zum Dashboard"
          actions={refreshAction}
        />

        <section
          className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
          data-testid="info-no-quarter"
        >
          <h2 className="text-base font-semibold text-anthrazit mb-2">
            Noch kein Quartier verknüpft
          </h2>
          <p className="text-sm text-muted-foreground">
            Fuer dieses Konto ist aktuell noch kein Quartier hinterlegt. Sobald
            die Zuordnung steht, erscheinen hier auch Karte und Quartierdaten.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-quartier-green text-white px-4 py-3 text-sm font-medium min-h-[48px] hover:opacity-90 transition-opacity"
          >
            Zurueck zum Dashboard
          </Link>
        </section>
      </div>
    );
  }

  if (!loading && apiError) {
    return (
      <div className={pageShellClass}>
        <MagazineHeader
          eyebrow={`QUARTIER · ${quartierName}`}
          title="Quartier-Info"
          backHref="/dashboard"
          backLabel="Zurück zum Dashboard"
          actions={refreshAction}
        />

        <section
          className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5"
          data-testid="info-api-error"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-anthrazit mb-2">
                Quartierdaten nicht geladen
              </h2>
              <p className="text-sm text-muted-foreground">{apiError}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={pageShellClass}>
      <MagazineHeader
        eyebrow={`QUARTIER · ${quartierName}`}
        title="Quartier-Info"
        subtitle="Wetter, Pollen, Notdienste, Apotheken, ÖPNV, Aktuelles."
        backHref="/dashboard"
        backLabel="Zurück zum Dashboard"
        actions={refreshAction}
      />

      {/* Vorlesen-Button (G-5) */}
      {!loading && data && (
        <section data-testid="info-vorlesen">
          <TTSButton text={buildDailyBrief(data)} />
        </section>
      )}

      {/* 1. Wetter */}
      <section data-testid="info-weather">
        {loading ? (
          <div className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5 space-y-3">
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
          <div className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5">
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
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
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
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
        id="warnungen"
        data-testid="info-warnungen"
      >
        <h2 className="text-base font-semibold text-anthrazit mb-3">
          Warnungen
        </h2>
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <ExternalWarningBanner
            showAction={false}
            emptyState={
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">Keine aktiven Warnungen</span>
              </div>
            }
          />
        )}
      </section>

      {/* 4. Naechste Abfuhr */}
      <section
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
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
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
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
            points={previewPoints}
          />
        </section>
      )}

      {/* 6. Apotheken */}
      <section
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
        data-testid="info-apotheken"
      >
        <div className="flex items-center gap-2 mb-3">
          <Pill className="h-5 w-5 text-green-600" />
          <h2 className="text-base font-semibold text-anthrazit">Apotheken</h2>
        </div>
        <div className="space-y-3">
          {(data?.apotheken || []).length > 0 ? (
            (data?.apotheken || []).map((apo: Apotheke) => (
              <div
                key={apo.name}
                className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-anthrazit">
                    {apo.name}
                  </p>
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
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <SafeExternalLink
                    href={buildApothekeMapUrl(apo)}
                    title={`${apo.name} auf Karte anzeigen`}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-warmwhite hover:bg-anthrazit-tint transition-colors"
                    aria-label={`${apo.name} auf Karte anzeigen`}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </SafeExternalLink>
                  <a
                    href={`tel:${apo.phone.replace(/\s/g, "")}`}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                    aria-label={`${apo.name} anrufen`}
                  >
                    <Phone className="h-4 w-4 text-green-700" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p
              className="text-sm text-muted-foreground"
              data-testid="info-apotheken-empty"
            >
              Fuer dieses Quartier sind aktuell keine Apothekeninformationen
              hinterlegt.
            </p>
          )}
        </div>
        {hasNotdienstUrl && data?.notdienst_url ? (
          <SafeExternalLink
            href={data.notdienst_url}
            title="Apotheken-Notdienst"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium text-sm hover:bg-amber-100 transition-colors min-h-[48px]"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Notdienst jetzt prüfen
            <ExternalLink className="h-3 w-3 text-amber-600" />
          </SafeExternalLink>
        ) : (
          <p
            className="mt-4 text-xs text-muted-foreground"
            data-testid="info-notdienst-unavailable"
          >
            Der Notdienst-Link ist fuer dieses Quartier aktuell noch nicht
            hinterlegt.
          </p>
        )}
      </section>

      {/* 7. Veranstaltungen */}
      <section
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
        data-testid="info-events"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h2 className="text-base font-semibold text-anthrazit">
            Veranstaltungen
          </h2>
        </div>
        <div className="space-y-3">
          {(data?.events || []).length > 0 ? (
            (data?.events || []).map((evt: LocalEvent, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-anthrazit-tint p-4"
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
            ))
          ) : (
            <p
              className="text-sm text-muted-foreground"
              data-testid="info-events-empty"
            >
              Fuer dieses Quartier sind aktuell keine Veranstaltungen
              hinterlegt.
            </p>
          )}
        </div>
        {hasEventsCalendarUrl && data?.events_calendar_url ? (
          <SafeExternalLink
            href={data.events_calendar_url}
            title="Veranstaltungskalender"
            className="mt-3 text-xs text-quartier-green hover:underline inline-flex items-center gap-1"
          >
            Alle Veranstaltungen anzeigen
            <ExternalLink className="h-3 w-3" />
          </SafeExternalLink>
        ) : (
          <p
            className="mt-3 text-xs text-muted-foreground"
            data-testid="info-events-calendar-unavailable"
          >
            Der Veranstaltungs-Kalender ist fuer dieses Quartier aktuell noch
            nicht verlinkt.
          </p>
        )}

        {/* Quartier-eigene Veranstaltungen — Pfad zum Anlegen & Anschauen */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-anthrazit-tint pt-4">
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 rounded-xl bg-quartier-green px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-quartier-green-dark"
            data-testid="info-events-create"
          >
            <Plus className="h-4 w-4" />
            Eigene Veranstaltung anlegen
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl border border-quartier-green/30 bg-warmwhite px-4 py-3 text-sm font-medium text-quartier-green transition-colors hover:bg-quartier-green/5"
            data-testid="info-events-list"
          >
            <Calendar className="h-4 w-4" />
            Alle Quartier-Veranstaltungen
          </Link>
        </div>
      </section>

      {/* 8. Rathaus & Services */}
      <section
        className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5"
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
              <SafeExternalLink
                key={link.label}
                href={link.url}
                title={link.label}
                className="flex flex-col gap-2 rounded-xl border border-anthrazit-tint bg-lifted-cream p-4 hover:bg-warmwhite transition-colors min-h-[80px]"
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
              </SafeExternalLink>
            ))}
          </div>
        )}
      </section>

      {/* Footer-Signatur — Visual-Polish v7 Konsistenz mit Dashboard. */}
      <footer className="flex justify-center pt-8 pb-2 opacity-70">
        <QuartierAppLogo variant="symbol" size={40} />
      </footer>
    </div>
  );
}
