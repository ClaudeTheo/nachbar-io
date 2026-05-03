// lib/care/hooks/useAssignedSeniors.ts
// Laedt die Senioren die dem aktuellen Helfer zugewiesen sind
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CaregiverRelationshipType, CareHelperRole } from '../services/types';
import { mapCaregiverRelationshipToRole } from "@/lib/care/permissions";
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

        let assignedSeniorIds = helper?.assigned_seniors ?? [];
        let assignedRole = (helper?.role as CareHelperRole | undefined) ?? null;

        if (!assignedSeniorIds.length) {
          const { data: caregiverLinks, error: linksError } = await supabase
            .from('caregiver_links')
            .select('resident_id, relationship_type')
            .eq('caregiver_id', user.id)
            .is('revoked_at', null);

          if (linksError) {
            setError(linksError.message);
            setLoading(false);
            return;
          }

          assignedSeniorIds = Array.from(
            new Set(
              (caregiverLinks ?? [])
                .map((link) => link.resident_id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0)
            )
          );

          const relationshipType = caregiverLinks?.[0]?.relationship_type;
          if (relationshipType) {
            assignedRole = mapCaregiverRelationshipToRole(
              relationshipType as CaregiverRelationshipType
            );
          }
        }

        if (!assignedSeniorIds.length) {
          setHelperRole(assignedRole);
          setSeniors([]);
          setLoading(false);
          return;
        }

        setHelperRole(assignedRole);

        // Senior-Profile laden
        const { data: seniorProfiles, error: profileError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
          .in('id', assignedSeniorIds);

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
