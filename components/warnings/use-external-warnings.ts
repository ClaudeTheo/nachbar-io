"use client";

// components/warnings/use-external-warnings.ts
// W6 (A4:3): Gemeinsame Warnquelle fuer den ExternalWarningBanner UND den
// Vorlesen-Tagesbrief (buildDailyBrief). Vorher hatte nur der Banner diese
// Pipeline (/api/warnings/*); der Brief las die tote data.nina-Pipeline —
// Ohr (Vorlesen) und Auge (Banner) konnten sich widersprechen.
//
// Fetch-, Normalisierungs- und Sortierlogik stammen 1:1 aus dem Banner
// (external-warning-banner.tsx) und wurden hierher extrahiert.

import { useEffect, useState } from "react";

export type WarningProvider = "nina" | "dwd" | "uba";
export type WarningSeverity =
  | "minor"
  | "moderate"
  | "severe"
  | "extreme"
  | "unknown";

const PROVIDERS: WarningProvider[] = ["nina", "dwd", "uba"];

const SEVERITY_RANK: Record<WarningSeverity, number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};

export interface ExternalWarningItem {
  id: string;
  provider: WarningProvider;
  headline: string;
  description: string | null;
  instruction: string | null;
  severity: WarningSeverity;
  sentAt: string | null;
  expiresAt: string | null;
  attributionText: string;
}

/**
 * Laedt die aktiven Warnungen aller Provider (NINA, DWD, UBA) und haelt sie
 * severity-sortiert im State.
 *
 * @returns `warnings === null` solange geladen wird; danach das (ggf. leere)
 *          sortierte Array. Provider-Fehler ergeben stille Teilausfaelle —
 *          gleiche Semantik wie der Banner vor der Extraktion.
 */
export function useExternalWarnings(options?: { enabled?: boolean }): {
  warnings: ExternalWarningItem[] | null;
} {
  const enabled = options?.enabled ?? true;
  const [warnings, setWarnings] = useState<ExternalWarningItem[] | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

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
      setWarnings(sortWarnings(combined));
    }

    void loadWarnings();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { warnings };
}

async function fetchProviderWarnings(provider: WarningProvider) {
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
  const sentAt =
    typeof record.sent_at === "string" ? record.sent_at.trim() : null;
  const expiresAt =
    typeof record.expires_at === "string" ? record.expires_at.trim() : null;

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
    sentAt: sentAt && sentAt.length > 0 ? sentAt : null,
    expiresAt: expiresAt && expiresAt.length > 0 ? expiresAt : null,
    attributionText,
  };
}

function normalizeProvider(value: unknown): WarningProvider | null {
  return value === "nina" || value === "dwd" || value === "uba" ? value : null;
}

function normalizeSeverity(value: unknown): WarningSeverity | null {
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
