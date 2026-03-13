// lib/care/hooks/useDocuments.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareDocument } from '../types';

/**
 * Laedt die Dokument-Liste fuer einen Senior.
 */
export function useDocuments(seniorId?: string) {
  const [documents, setDocuments] = useState<CareDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!seniorId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('care_documents')
        .select('*')
        .eq('senior_id', seniorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
      } else {
        setDocuments((data as CareDocument[]) ?? []);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setDocuments([]);
    }
    setLoading(false);
  }, [seniorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
    load();
  }, [load]);

  return { documents, loading, refetch: load };
}
