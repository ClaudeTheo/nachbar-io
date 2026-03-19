"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Plus, RefreshCw, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import type { MunicipalReport, ReportCategory } from "@/lib/municipal";
import { REPORT_CATEGORIES, REPORT_STATUS_CONFIG, DISCLAIMERS } from "@/lib/municipal";

// Deutscher relativer Zeitstempel
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  return new Date(dateStr).toLocaleDateString("de-DE");
}

// Kategorie-Icon anhand der ID finden
function getCategoryIcon(category: ReportCategory): string {
  return REPORT_CATEGORIES.find((c) => c.id === category)?.icon ?? "❓";
}

// Kategorie-Label anhand der ID finden
function getCategoryLabel(category: ReportCategory): string {
  return REPORT_CATEGORIES.find((c) => c.id === category)?.label ?? "Sonstiges";
}

// Status-Config anhand der ID finden
function getStatusConfig(status: string) {
  return REPORT_STATUS_CONFIG.find((s) => s.id === status) ?? REPORT_STATUS_CONFIG[0];
}

// Skeleton-Karte fuer Ladezustand
function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-xl bg-white p-3 shadow-soft animate-pulse">
      <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-200" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { currentQuarter } = useQuarter();
  const [reports, setReports] = useState<MunicipalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ReportCategory | null>(null);

  // Meldungen vom Server laden
  const fetchReports = useCallback(async (isRefresh = false) => {
    if (!currentQuarter?.id) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("municipal_reports")
        .select("*")
        .eq("quarter_id", currentQuarter.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der Meldungen:", error);
        return;
      }

      setReports((data as MunicipalReport[]) ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentQuarter?.id]);

  // Beim Laden und bei Quartierwechsel Meldungen abrufen
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Gefilterte Meldungen basierend auf aktiver Kategorie
  const filteredReports = activeFilter
    ? reports.filter((r) => r.category === activeFilter)
    : reports;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header mit Zurueck-Pfeil und Melden-Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Zurück zum Dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Mängelmelder</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Manuell aktualisieren */}
          <button
            onClick={() => fetchReports(true)}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            aria-label="Meldungen aktualisieren"
          >
            <RefreshCw className={`h-4 w-4 text-anthrazit ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/reports/new"
            className="flex h-[44px] items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-medium text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Melden
          </Link>
        </div>
      </div>

      {/* Disclaimer-Banner */}
      <div className="rounded-lg border border-alert-amber/30 bg-alert-amber/5 p-3 text-xs text-muted-foreground">
        {DISCLAIMERS.reportCreate}
      </div>

      {/* Kategorie-Filter — horizontal scrollbar */}
      <div className="-mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveFilter(null)}
            className={`flex h-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === null
                ? "bg-anthrazit text-white"
                : "bg-white text-anthrazit shadow-soft hover:bg-gray-50"
            }`}
          >
            Alle
            {reports.length > 0 && (
              <span className="ml-0.5 text-[10px] opacity-70">({reports.length})</span>
            )}
          </button>
          {REPORT_CATEGORIES.map((cat) => {
            const count = reports.filter((r) => r.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
                className={`flex h-[44px] shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === cat.id
                    ? "bg-anthrazit text-white"
                    : "bg-white text-anthrazit shadow-soft hover:bg-gray-50"
                }`}
              >
                <span aria-hidden="true">{cat.icon}</span> {cat.label}
                {count > 0 && (
                  <span className="ml-0.5 text-[10px] opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ladezustand — Skeleton-Karten */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Meldungsliste */}
      {!loading && filteredReports.length > 0 && (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const statusCfg = getStatusConfig(report.status);
            return (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex gap-3 rounded-xl bg-white p-3 shadow-soft transition-all hover:shadow-md active:scale-[0.99] animate-fade-in-up"
              >
                {/* Foto oder Kategorie-Icon */}
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {report.photo_url ? (
                    <Image
                      src={report.photo_url}
                      alt={getCategoryLabel(report.category)}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      {getCategoryIcon(report.category)}
                    </div>
                  )}
                </div>

                {/* Inhalt */}
                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  {/* Badges: Kategorie + Status */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-anthrazit">
                      {getCategoryIcon(report.category)} {getCategoryLabel(report.category)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.color} ${statusCfg.bgColor}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Beschreibung (maximal 2 Zeilen) */}
                  {report.description && (
                    <p className="line-clamp-2 text-sm text-anthrazit">
                      {report.description}
                    </p>
                  )}

                  {/* Ort + Zeitstempel */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {report.location_text || "Kein Ort angegeben"}
                    </span>
                    <span className="flex-shrink-0">
                      {relativeTime(report.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Leerzustand — keine Meldungen oder kein Treffer im Filter */}
      {!loading && filteredReports.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 text-5xl" aria-hidden="true">🔧</div>
          <h2 className="text-lg font-semibold text-anthrazit">
            {activeFilter ? "Keine Meldungen in dieser Kategorie" : "Noch keine Meldungen"}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {activeFilter
              ? "Versuchen Sie eine andere Kategorie oder melden Sie einen neuen Mangel."
              : "Melden Sie Mängel in Ihrem Quartier — Schlaglöcher, defekte Laternen, illegaler Müll und mehr."}
          </p>
          <Link
            href="/reports/new"
            className="mt-4 flex h-[48px] items-center rounded-lg bg-quartier-green px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
          >
            {activeFilter ? "Mangel melden" : "Ersten Mangel melden"}
          </Link>
        </div>
      )}

      {/* Status-Legende */}
      <div className="flex flex-wrap gap-2 pt-2">
        {REPORT_STATUS_CONFIG.map((s) => (
          <span key={s.id} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${s.color} ${s.bgColor}`}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
