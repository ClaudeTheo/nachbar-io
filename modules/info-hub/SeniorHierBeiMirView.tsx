// modules/info-hub/SeniorHierBeiMirView.tsx
// Praesentations-Komponente fuer den Senior-Info-Hub "Hier bei mir" (Welle S1,
// A4:4). Reine Darstellung — die Daten kommen als Props (Container = die Route
// app/(senior)/hier-bei-mir/page.tsx via useQuartierInfo). Die Trennung macht
// die UI ohne Auth/Fetch testbar und in der lokalen UI-Preview darstellbar.
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Train,
  Pill,
  Phone,
  RefreshCw,
} from "lucide-react";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { ExternalWarningBanner } from "@/components/warnings/external-warning-banner";
import { ExternalLink as SafeExternalLink } from "@/components/ExternalLink";
import { TTSButton } from "@/modules/voice/components/companion/TTSButton";
import { buildDailyBrief } from "@/modules/voice/services/daily-brief.service";
import type { ExternalWarningItem } from "@/components/warnings/use-external-warnings";
import type { UseQuartierInfoResult } from "@/modules/info-hub/useQuartierInfo";
import type {
  WasteNext,
  OepnvStop,
  OepnvDeparture,
  Apotheke,
} from "@/modules/info-hub/types";

// Datum lang + ausgeschrieben — gut lesbar fuer Senioren.
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Senioren-Karte: grosse Ueberschrift, ruhiger Rahmen, viel Weissraum.
function SeniorCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-anthrazit/15 bg-white p-5">
      <h2 className="mb-4 text-2xl font-bold text-anthrazit">{title}</h2>
      {children}
    </section>
  );
}

export interface SeniorHierBeiMirViewProps {
  currentQuarter: UseQuartierInfoResult["currentQuarter"];
  data: UseQuartierInfoResult["data"];
  apiError: UseQuartierInfoResult["apiError"];
  loading: boolean;
  onRefresh: () => void;
  /**
   * Warnungen aus useExternalWarnings (W6, A4:3) — gehen an Banner UND
   * Vorlesen-Brief, damit Ohr und Auge aus derselben Datenmenge sprechen.
   * Bewusst Pflicht-Prop: ein Consumer, der ihn vergisst, liesse Banner
   * (Self-Fetch) und Brief (Legacy data.nina) wieder auseinanderlaufen.
   */
  warnings: ExternalWarningItem[] | null;
}

export function SeniorHierBeiMirView({
  currentQuarter,
  data,
  apiError,
  loading,
  onRefresh,
  warnings,
}: SeniorHierBeiMirViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-anthrazit">Hier bei mir</h1>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Aktualisieren"
          className="flex items-center justify-center rounded-2xl border-2 border-anthrazit/15 bg-white text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
          style={{ minHeight: "64px", minWidth: "64px" }}
        >
          <RefreshCw className={`h-7 w-7 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!currentQuarter && !loading ? (
        <SeniorCard title="Noch kein Quartier">
          <p className="text-xl text-gray-700">
            Für Sie ist noch kein Quartier hinterlegt. Sobald das eingerichtet
            ist, sehen Sie hier Wetter, Müllabfuhr und Aktuelles.
          </p>
        </SeniorCard>
      ) : apiError ? (
        <SeniorCard title="Gerade nicht erreichbar">
          <p className="text-xl text-gray-700">
            Die Informationen lassen sich gerade nicht laden. Bitte versuchen
            Sie es in einem Moment noch einmal.
          </p>
        </SeniorCard>
      ) : (
        <>
          {/* Vorlesen */}
          {!loading && data && (
            <div data-testid="senior-info-vorlesen">
              <TTSButton text={buildDailyBrief(data, warnings)} />
            </div>
          )}

          {/* Wetter */}
          {data?.weather && (
            <WeatherWidget
              variant="full"
              temp={data.weather.temp}
              description={data.weather.description}
              icon={data.weather.icon}
              forecast={data.weather.forecast}
            />
          )}

          {/* Warnungen */}
          <SeniorCard title="Warnungen">
            <ExternalWarningBanner
              items={warnings}
              showAction={false}
              emptyState={
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-7 w-7" />
                  <span className="text-xl">Keine Warnungen. Alles ruhig.</span>
                </div>
              }
            />
          </SeniorCard>

          {/* Nächste Abfuhr */}
          <SeniorCard title="Nächste Müllabfuhr">
            {data?.waste_next && data.waste_next.length > 0 ? (
              <ul className="space-y-3">
                {data.waste_next.map((w: WasteNext, i: number) => (
                  <li key={i} className="flex items-center gap-3">
                    <Trash2 className="h-7 w-7 flex-shrink-0 text-anthrazit" />
                    <span className="text-xl text-anthrazit">
                      <span className="font-semibold">{formatDate(w.date)}</span>
                      {" — "}
                      {w.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xl text-gray-700">Keine Termine hinterlegt.</p>
            )}
          </SeniorCard>

          {/* Nächste Abfahrten */}
          {data?.oepnv && data.oepnv.length > 0 && (
            <SeniorCard title="Nächste Abfahrten">
              <div className="space-y-5">
                {data.oepnv.map((stop: OepnvStop) => (
                  <div key={stop.id}>
                    <p className="mb-2 flex items-center gap-2 text-lg font-semibold text-anthrazit">
                      <Train className="h-6 w-6 text-blue-600" />
                      {stop.name}
                    </p>
                    <ul className="space-y-2">
                      {stop.departures
                        .slice(0, 5)
                        .map((dep: OepnvDeparture, i: number) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 text-xl text-anthrazit"
                          >
                            <span className="w-16 font-mono font-bold">
                              {dep.time}
                            </span>
                            <span className="font-semibold text-blue-700">
                              {dep.line}
                            </span>
                            <span className="flex-1">{dep.destination}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SeniorCard>
          )}

          {/* Apotheken & Notdienst */}
          <SeniorCard title="Apotheken">
            {(data?.apotheken || []).length > 0 ? (
              <ul className="space-y-4">
                {(data?.apotheken || []).map((apo: Apotheke) => (
                  <li
                    key={apo.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-xl font-semibold text-anthrazit">
                        <Pill className="h-6 w-6 text-green-600" />
                        {apo.name}
                      </p>
                      <p className="text-lg text-gray-700">{apo.address}</p>
                    </div>
                    <a
                      href={`tel:${apo.phone.replace(/\s/g, "")}`}
                      aria-label={`${apo.name} anrufen`}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-quartier-green px-5 font-bold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
                      style={{ minHeight: "80px", minWidth: "80px" }}
                    >
                      <Phone className="h-6 w-6" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xl text-gray-700">
                Für Ihr Quartier sind aktuell keine Apotheken hinterlegt.
              </p>
            )}
            {data?.notdienst_url && (
              <SafeExternalLink
                href={data.notdienst_url}
                title="Apotheken-Notdienst"
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 text-xl font-bold text-amber-900 focus:outline-none focus:ring-4 focus:ring-amber-200"
                style={{ minHeight: "80px" }}
              >
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                Notdienst heute
              </SafeExternalLink>
            )}
          </SeniorCard>
        </>
      )}

      {/* Zurück in die Senior-Shell */}
      <Link
        href="/kreis-start"
        className="flex items-center justify-center rounded-2xl border-2 border-anthrazit bg-white px-6 text-xl font-bold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
        style={{ minHeight: "80px", touchAction: "manipulation" }}
      >
        Zur Startseite
      </Link>
    </div>
  );
}
