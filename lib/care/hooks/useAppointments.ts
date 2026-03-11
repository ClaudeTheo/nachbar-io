// lib/care/hooks/useAppointments.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareAppointment } from '../types';

export function useAppointments(seniorId?: string, upcoming = true) {
  const [appointments, setAppointments] = useState<CareAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!seniorId) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ senior_id: seniorId, upcoming: String(upcoming) });

    try {
      const res = await fetch(`/api/care/appointments?${params}`);
      if (res.ok) setAppointments(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [seniorId, upcoming]);

  useEffect(() => { load(); }, [load]);

  return { appointments, loading, refetch: load };
}
