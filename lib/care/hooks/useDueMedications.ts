// lib/care/hooks/useDueMedications.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareMedication } from '../types';

interface DueMedication {
  medication: CareMedication;
  scheduled_at: string;
  status: string;
  snoozed_until: string | null;
}

export function useDueMedications(seniorId?: string) {
  const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!seniorId) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ senior_id: seniorId });

    try {
      const res = await fetch(`/api/care/medications/due?${params}`);
      if (res.ok) setDueMeds(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [seniorId]);

  useEffect(() => { load(); }, [load]);

  return { dueMeds, loading, refetch: load };
}
