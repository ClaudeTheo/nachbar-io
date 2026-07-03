"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { AttributionFooter } from "./attribution-footer";
import {
  useExternalWarnings,
  type ExternalWarningItem,
  type WarningProvider,
  type WarningSeverity,
} from "./use-external-warnings";

interface ExternalWarningBannerProps {
  emptyState?: ReactNode;
  maxItems?: number;
  showAction?: boolean;
  actionHref?: string;
  actionLabel?: string;
  /**
   * Extern geladene Warnungen (W6, A4:3): Seiten, die den Banner UND den
   * Vorlesen-Brief rendern, laden die Warnungen einmal via
   * useExternalWarnings und uebergeben sie hier — Ohr und Auge sprechen
   * dann aus derselben Datenmenge. `undefined` = Banner laedt selbst
   * (Verhalten vor W6); `null` = Laden laeuft noch.
   */
  items?: ExternalWarningItem[] | null;
}

export function ExternalWarningBanner({
  emptyState,
  maxItems,
  showAction = true,
  actionHref = "/quartier-info#warnungen",
  actionLabel = "Warnung anzeigen",
  items,
}: ExternalWarningBannerProps) {
  const { warnings: fetchedWarnings } = useExternalWarnings({
    enabled: items === undefined,
  });
  const warnings = items === undefined ? fetchedWarnings : items;

  const visibleWarnings = useMemo(() => {
    const list = warnings ?? [];
    return typeof maxItems === "number" ? list.slice(0, maxItems) : list;
  }, [warnings, maxItems]);

  if (warnings == null) {
    return null;
  }

  if (visibleWarnings.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="space-y-3" data-testid="external-warning-banner">
      {visibleWarnings.map((warning) => (
        <article
          key={warning.id}
          className={`rounded-2xl border p-4 shadow-sm ${
            warning.severity === "severe" || warning.severity === "extreme"
              ? "border-amber-400 bg-amber-100"
              : "border-amber-300 bg-amber-50"
          }`}
          data-testid="external-warning-card"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-950">
                  {formatProvider(warning.provider)}
                </span>
                <span className="rounded-full bg-amber-200/70 px-2 py-1 text-[11px] font-medium text-amber-950">
                  {formatSeverity(warning.severity)}
                </span>
                {warning.expiresAt ? (
                  <span className="text-xs text-amber-900/80">
                    Gilt bis: {formatSentAt(warning.expiresAt)}
                  </span>
                ) : warning.sentAt ? (
                  <span className="text-xs text-amber-900/80">
                    Aktualisiert: {formatSentAt(warning.sentAt)}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-2 text-base font-semibold text-amber-950">
                {warning.headline}
              </h3>

              {warning.description ? (
                <p className="mt-2 text-sm leading-6 text-amber-950/90">
                  {warning.description}
                </p>
              ) : null}

              {warning.instruction ? (
                <p className="mt-2 text-sm font-medium leading-6 text-amber-950">
                  {warning.instruction}
                </p>
              ) : null}

              {showAction ? (
                <Link
                  href={actionHref}
                  className="mt-4 inline-flex min-h-[80px] w-full items-center justify-between rounded-2xl border border-amber-400 bg-white px-4 py-4 text-left text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-50"
                >
                  <span>{actionLabel}</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              ) : null}

              <AttributionFooter attributionText={warning.attributionText} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatProvider(provider: WarningProvider) {
  if (provider === "nina") {
    return "NINA";
  }

  if (provider === "dwd") {
    return "DWD";
  }

  return "UBA";
}

function formatSeverity(severity: WarningSeverity) {
  if (severity === "extreme" || severity === "severe") {
    return "Hohe Prioritaet";
  }

  if (severity === "moderate") {
    return "Bitte beachten";
  }

  if (severity === "minor") {
    return "Hinweis";
  }

  return "Information";
}

function formatSentAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  // Explizite Zeitzone Europe/Berlin (App-Markt DE+CH) — sonst rendert der
  // Vercel-Server in fra1 zwar gleich wie lokal, CI-Linux aber in UTC und
  // External-Warning-Banner-Tests werden Timezone-flaky.
  return date.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
