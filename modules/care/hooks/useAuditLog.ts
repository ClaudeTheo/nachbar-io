// lib/care/hooks/useAuditLog.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareAuditEntry } from '../services/types';

export function useAuditLog(seniorId?: string, limit = 50) {
  const [entries, setEntries] = useState<CareAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
    if (!seniorId) { setLoading(false); return; }
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('care_audit_log')
        .select('*')
        .eq('senior_id', seniorId)
        .order('created_at', { ascending: false })
        .limit(limit);
      setEntries((data as CareAuditEntry[]) ?? []);
      setLoading(false);
    }

    load();
  }, [seniorId, limit]);

  return { entries, loading };
}
