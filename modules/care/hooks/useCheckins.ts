// lib/care/hooks/useCheckins.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareCheckin } from '../services/types';

export function useCheckins(seniorId?: string, limit = 30) {
  const [checkins, setCheckins] = useState<CareCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
    if (!seniorId) { setLoading(false); return; }
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('care_checkins')
        .select('*')
        .eq('senior_id', seniorId)
        .order('scheduled_at', { ascending: false })
        .limit(limit);
      setCheckins((data as CareCheckin[]) ?? []);
      setLoading(false);
    }

    load();
  }, [seniorId, limit]);

  return { checkins, loading };
}
