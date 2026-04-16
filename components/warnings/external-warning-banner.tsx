"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { AttributionFooter } from "./attribution-footer";

type Provider = "nina" | "dwd" | "uba";
type Severity = "minor" | "moderate" | "severe" | "extreme" | "unknown";

const PROVIDERS: Provider[] = ["nina", "dwd", "uba"];
const SEVERITY_RANK: Record<Severity, number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};

interface ExternalWarningItem {
  id: string;
  provider: Provider;
  headline: string;
  description: string | null;
  instruction: string | null;
  severity: Severity;
  sentAt: string | null;
  attributionText: string;
}

interface ExternalWarningBannerProps {
  emptyState?: ReactNode;
  maxItems?: number;
  showAction?: boolean;
  actionHref?: string;
  actionLabel?: string;
}

export function ExternalWarningBanner({
  emptyState,
  maxItems,
  showAction = true,
  actionHref = "/quartier-info#warnungen",
  actionLabel = "Warnung anzeigen",
}: ExternalWarningBannerProps) {
  const [warnings, setWarnings] = useState<ExternalWarningItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWarnings() {
      const settled = await Promise.allSettled(
        PROVIDERS.map((provider) => fetchProviderWarnings(provider)),
      );
      if (cancelled) {
        return;
      }

      const combined = settled.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      const sorted = sortWarnings(combined);
      setWarnings(typeof maxItems === "number" ? sorted.slice(0, maxItems) : sorted);
    }

    void loadWarnings();

    return () => {
      cancelled = true;
    };
  }, [maxItems]);

  const visibleWarnings = useMemo(() => warnings ?? [], [warnings]);

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
                {warning.sentAt ? (
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

async function fetchProviderWarnings(provider: Provider) {
  try {
    const response = await fetch(`/api/warnings/${provider}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map(normalizeWarning)
      .filter((warning): warning is ExternalWarningItem => warning !== null);
  } catch {
    return [];
  }
}

function normalizeWarning(value: unknown): ExternalWarningItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const provider = normalizeProvider(record.provider);
  const severity = normalizeSeverity(record.severity);
  const id = typeof record.id === "string" ? record.id : null;
  const headline = typeof record.headline === "string" ? record.headline : null;
  const attributionText =
    typeof record.attribution_text === "string" ? record.attribution_text : null;

  if (!provider || !severity || !id || !headline || !attributionText) {
    return null;
  }

  return {
    id,
    provider,
    headline,
    description: typeof record.description === "string" ? record.description : null,
    instruction: typeof record.instruction === "string" ? record.instruction : null,
    severity,
    sentAt: typeof record.sent_at === "string" ? record.sent_at : null,
    attributionText,
  };
}

function normalizeProvider(value: unknown): Provider | null {
  return value === "nina" || value === "dwd" || value === "uba" ? value : null;
}

function normalizeSeverity(value: unknown): Severity | null {
  return value === "minor" ||
    value === "moderate" ||
    value === "severe" ||
    value === "extreme" ||
    value === "unknown"
    ? value
    : null;
}

function sortWarnings(warnings: ExternalWarningItem[]) {
  return [...warnings].sort((left, right) => {
    const severityDiff = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const leftSent = left.sentAt ? Date.parse(left.sentAt) : 0;
    const rightSent = right.sentAt ? Date.parse(right.sentAt) : 0;
    return rightSent - leftSent;
  });
}

function formatProvider(provider: Provider) {
  if (provider === "nina") {
    return "NINA";
  }

  if (provider === "dwd") {
    return "DWD";
  }

  return "UBA";
}

function formatSeverity(severity: Severity) {
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

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
