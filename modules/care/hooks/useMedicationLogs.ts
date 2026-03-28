// lib/care/hooks/useMedicationLogs.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareMedicationLog } from '../services/types';

export function useMedicationLogs(seniorId?: string, medicationId?: string) {
  const [logs, setLogs] = useState<CareMedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!seniorId) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ senior_id: seniorId });
    if (medicationId) params.set('medication_id', medicationId);

    try {
      const res = await fetch(`/api/care/medications/log?${params}`);
      if (res.ok) setLogs(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [seniorId, medicationId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
  useEffect(() => { load(); }, [load]);

  return { logs, loading, refetch: load };
}
