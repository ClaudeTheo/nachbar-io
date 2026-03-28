// lib/care/hooks/useHelpers.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CareHelper } from '../services/types';

export function useHelpers(seniorId?: string, role?: string) {
  const [helpers, setHelpers] = useState<CareHelper[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: 'all' });
    if (seniorId) params.set('senior_id', seniorId);
    if (role) params.set('role', role);

    try {
      const res = await fetch(`/api/care/helpers?${params}`);
      if (res.ok) setHelpers(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [seniorId, role]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
  useEffect(() => { load(); }, [load]);

  return { helpers, loading, refetch: load };
}
