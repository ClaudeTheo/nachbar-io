// lib/care/hooks/useAppointments.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareAppointment } from '../types';

export function useAppointments(seniorId?: string, upcoming = true) {
  const [appointments, setAppointments] = useState<CareAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!seniorId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ senior_id: seniorId, upcoming: String(upcoming) });

    try {
      const res = await fetch(`/api/care/appointments?${params}`);
      if (res.ok) {
        setAppointments(await res.json());
      } else {
        setError('Termine konnten nicht geladen werden');
      }
    } catch {
      setError('Verbindungsfehler');
    }
    setLoading(false);
  }, [seniorId, upcoming]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
  useEffect(() => { load(); }, [load]);

  return { appointments, loading, error, refetch: load };
}
