// lib/hooks/useTrustLevel.ts
// Hook fuer Trust-Level des aktuellen Nutzers
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser } from "@/lib/supabase/cached-auth";

export type TrustLevel = 'new' | 'verified' | 'trusted' | 'lotse' | 'admin';

interface UseTrustLevelResult {
  trustLevel: TrustLevel;
  loading: boolean;
  // Convenience-Checks
  isVerified: boolean;     // verified oder hoeher
  canPost: boolean;        // verified+: Pinnwand posten, Hilfe anbieten
  canCreateAlerts: boolean; // trusted+: Alerts erstellen
  canModerate: boolean;    // lotse+: Moderations-Tools
}

const TRUST_ORDER: TrustLevel[] = ['new', 'verified', 'trusted', 'lotse', 'admin'];

function hasMinLevel(current: TrustLevel, minimum: TrustLevel): boolean {
  return TRUST_ORDER.indexOf(current) >= TRUST_ORDER.indexOf(minimum);
}

export function useTrustLevel(): UseTrustLevelResult {
  const [trustLevel, setTrustLevel] = useState<TrustLevel>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser(supabase).then(async ({ user }) => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('trust_level')
          .eq('id', user.id)
          .single();
        setTrustLevel((data?.trust_level as TrustLevel) ?? 'new');
      }
      setLoading(false);
    });
  }, []);

  return {
    trustLevel,
    loading,
    isVerified: hasMinLevel(trustLevel, 'verified'),
    canPost: hasMinLevel(trustLevel, 'verified'),
    canCreateAlerts: hasMinLevel(trustLevel, 'trusted'),
    canModerate: hasMinLevel(trustLevel, 'lotse'),
  };
}
