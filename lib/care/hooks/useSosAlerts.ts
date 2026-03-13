// lib/care/hooks/useSosAlerts.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareSosAlert } from '../types';

export function useSosAlerts(seniorId?: string) {
  const [alerts, setAlerts] = useState<CareSosAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
    if (!seniorId) { setLoading(false); return; }
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('care_sos_alerts')
        .select('*')
        .eq('senior_id', seniorId)
        .order('created_at', { ascending: false })
        .limit(20);
      setAlerts((data as CareSosAlert[]) ?? []);
      setLoading(false);
    }

    load();

    // Realtime-Subscription fuer neue SOS-Alerts
    const channel = supabase
      .channel('care-sos-' + seniorId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'care_sos_alerts',
        filter: `senior_id=eq.${seniorId}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [seniorId]);

  return { alerts, loading };
}
