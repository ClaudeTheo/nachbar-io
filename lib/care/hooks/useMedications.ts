// lib/care/hooks/useMedications.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareMedication } from '../types';

export function useMedications(seniorId?: string) {
  const [medications, setMedications] = useState<CareMedication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seniorId) { setLoading(false); return; }
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('care_medications')
        .select('*')
        .eq('senior_id', seniorId)
        .eq('active', true)
        .order('created_at', { ascending: false });
      setMedications((data as CareMedication[]) ?? []);
      setLoading(false);
    }

    load();
  }, [seniorId]);

  return { medications, loading, refetch: () => {} };
}
