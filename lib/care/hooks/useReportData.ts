// lib/care/hooks/useReportData.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareDocumentType } from '../types';
import type { ReportData } from '../reports/types';

interface UseReportDataParams {
  seniorId?: string;
  periodStart?: string;
  periodEnd?: string;
  type?: CareDocumentType;
}

/**
 * Laedt Bericht-Daten (JSON) fuer Client-seitiges Rendering.
 * Fetcht nur wenn alle Parameter gesetzt sind.
 */
export function useReportData(params: UseReportDataParams) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const { seniorId, periodStart, periodEnd, type } = params;

  const load = useCallback(async () => {
    if (!seniorId || !periodStart || !periodEnd || !type) {
      setReportData(null);
      return;
    }
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        senior_id: seniorId,
        period_start: periodStart,
        period_end: periodEnd,
        type,
      });
      const res = await fetch(`/api/care/reports/data?${searchParams}`);
      if (res.ok) {
        const data: ReportData = await res.json();
        setReportData(data);
      } else {
        console.error('Error loading report data:', res.status);
        setReportData(null);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
      setReportData(null);
    }
    setLoading(false);
  }, [seniorId, periodStart, periodEnd, type]);

  useEffect(() => {
    load();
  }, [load]);

  return { reportData, loading, refetch: load };
}
