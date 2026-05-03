// lib/care/hooks/useCareProfile.ts
'use client';

import { useEffect, useState } from 'react';
import type { CareProfile } from '../services/types';

export function useCareProfile(userId?: string) {
  const [profile, setProfile] = useState<CareProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
    if (!userId) { setLoading(false); return; }

    const seniorId = userId;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/care/profile?senior_id=${encodeURIComponent(seniorId)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error ?? 'Profil konnte nicht geladen werden');
          setProfile(null);
        } else {
          setProfile(data as CareProfile | null);
        }
      } catch {
        setError('Profil konnte nicht geladen werden');
        setProfile(null);
      }

      setLoading(false);
    }

    load();
  }, [userId]);

  return { profile, loading, error };
}
