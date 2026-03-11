// lib/care/hooks/useCareProfile.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareProfile } from '../types';

export function useCareProfile(userId?: string) {
  const [profile, setProfile] = useState<CareProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('care_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (err) {
        setError(err.message);
      } else {
        setProfile(data as CareProfile | null);
      }
      setLoading(false);
    }

    load();
  }, [userId]);

  return { profile, loading, error };
}
