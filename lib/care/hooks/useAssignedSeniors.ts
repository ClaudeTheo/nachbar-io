// lib/care/hooks/useAssignedSeniors.ts
// Laedt die Senioren die dem aktuellen Helfer zugewiesen sind
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareHelperRole } from '../types';
import { getCachedUser } from "@/lib/supabase/cached-auth";

export interface SeniorInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface UseAssignedSeniorsResult {
  seniors: SeniorInfo[];
  helperRole: CareHelperRole | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook fuer Angehoerige/Pflegedienst: Laedt alle zugewiesenen Senioren
 * mit Profil-Informationen (Name, Avatar).
 */
export function useAssignedSeniors(): UseAssignedSeniorsResult {
  const [seniors, setSeniors] = useState<SeniorInfo[]>([]);
  const [helperRole, setHelperRole] = useState<CareHelperRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { user } = await getCachedUser(supabase);
        if (!user) {
          setLoading(false);
          return;
        }

        // Eigenen Helfer-Record laden (nur verifizierte)
        const { data: helper, error: helperError } = await supabase
          .from('care_helpers')
          .select('role, assigned_seniors')
          .eq('user_id', user.id)
          .eq('verification_status', 'verified')
          .maybeSingle();

        if (helperError) {
          setError(helperError.message);
          setLoading(false);
          return;
        }

        if (!helper || !helper.assigned_seniors?.length) {
          setHelperRole(helper?.role as CareHelperRole ?? null);
          setSeniors([]);
          setLoading(false);
          return;
        }

        setHelperRole(helper.role as CareHelperRole);

        // Senior-Profile laden
        const { data: seniorProfiles, error: profileError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
          .in('id', helper.assigned_seniors);

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        setSeniors(
          (seniorProfiles ?? []).map((u) => ({
            id: u.id,
            display_name: u.display_name ?? 'Unbekannt',
            avatar_url: u.avatar_url ?? null,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { seniors, helperRole, loading, error };
}
