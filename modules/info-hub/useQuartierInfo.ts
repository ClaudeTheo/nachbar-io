"use client";

// modules/info-hub/useQuartierInfo.ts
// Gemeinsamer Daten-Hook fuer den Quartier-Info-Hub. Kapselt die Beschaffung
// (useQuarter + /api/quartier-info + normalizeQuartierInfoResponse + Fehler-/
// Lade-Handling + Refresh), damit sowohl die Standard-Seite (/quartier-info)
// als auch die Senior-Variante (/hier-bei-mir in der (senior)-Shell) dieselbe
// Logik nutzen — kein Duplikat (Welle S1, Schritt 4).

import { useCallback, useEffect, useState } from "react";
import { useQuarter } from "@/lib/quarters";
import { normalizeQuartierInfoResponse } from "@/modules/info-hub/normalize-response";
import type { QuartierInfoResponse } from "@/modules/info-hub/types";

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

export interface UseQuartierInfoResult {
  currentQuarter: ReturnType<typeof useQuarter>["currentQuarter"];
  quarterLoading: boolean;
  data: QuartierInfoResponse | null;
  apiError: string | null;
  /** quarterLoading || laufender Datenabruf */
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useQuartierInfo(): UseQuartierInfoResult {
  const { currentQuarter, loading: quarterLoading, refreshQuarter } =
    useQuarter();
  const quarterId = currentQuarter?.id;
  const [data, setData] = useState<QuartierInfoResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

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

  const refresh = useCallback(async () => {
    // Ohne zugeordnetes Quartier zuerst die Quartier-Zuordnung neu laden.
    if (!quarterId) {
      await refreshQuarter();
      return;
    }
    await loadData();
  }, [loadData, quarterId, refreshQuarter]);

  return {
    currentQuarter,
    quarterLoading,
    data,
    apiError,
    loading: quarterLoading || loadingData,
    refresh,
  };
}
