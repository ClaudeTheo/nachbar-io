// lib/youth/hooks.ts
// Jugend-Modul: React Hooks fuer Youth-Profile
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AccessLevel } from './profile';
import { getCachedUser } from "@/lib/supabase/cached-auth";

export interface YouthProfileData {
  access_level: AccessLevel;
  age_group: string;
  birth_year: number;
  quarter_id: string | null;
  total_points?: number;
}

export function useYouthProfile() {
  const [profile, setProfile] = useState<YouthProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('youth_profiles')
        .select('access_level, age_group, birth_year, quarter_id')
        .eq('user_id', user.id)
        .single();

      if (data) {
        // Punkte aus dem Ledger summieren
        const { data: pointsData } = await supabase
          .from('youth_points_ledger')
          .select('points')
          .eq('user_id', user.id);

        const totalPoints = (pointsData || []).reduce((sum, row) => sum + (row.points || 0), 0);
        setProfile({ ...(data as YouthProfileData), total_points: totalPoints });
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    loadProfile();
  }, []);

  return { profile, loading };
}
