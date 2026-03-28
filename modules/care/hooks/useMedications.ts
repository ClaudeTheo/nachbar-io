// lib/care/hooks/useMedications.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareMedication } from '../services/types';

export function useMedications(seniorId?: string) {
  const [medications, setMedications] = useState<CareMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!seniorId) { setLoading(false); return; }
    const supabase = createClient();

    setLoading(true);
    const { data } = await supabase
      .from('care_medications')
      .select('*')
      .eq('senior_id', seniorId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    setMedications((data as CareMedication[]) ?? []);
    setLoading(false);
  }, [seniorId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
  useEffect(() => { load(); }, [load]);

  return { medications, loading, refetch: load };
}
