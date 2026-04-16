// lib/care/hooks/useCareRole.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CareUserRole } from '../services/types';
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { mapCaregiverRelationshipToRole } from "@/lib/care/permissions";

/**
 * Ermittelt die Care-Rolle des aktuellen Users
 * im Kontext eines bestimmten Seniors.
 */
export function useCareRole(seniorId?: string) {
  const [role, setRole] = useState<CareUserRole>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount
    if (!seniorId) { setLoading(false); return; }

    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { user } = await getCachedUser(supabase);
      if (!user) { setRole('none'); setLoading(false); return; }

      // Senior selbst?
      if (user.id === seniorId) { setRole('senior'); setLoading(false); return; }

      // Admin?
      const { data: userData } = await supabase
        .from('users').select('is_admin').eq('id', user.id).single();
      if (userData?.is_admin) { setRole('admin'); setLoading(false); return; }

      // Helfer?
      const { data: helper } = await supabase
        .from('care_helpers')
        .select('role, assigned_seniors')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified')
        .maybeSingle();

      if (helper?.assigned_seniors?.includes(seniorId)) {
        setRole(helper.role as CareUserRole);
        setLoading(false);
        return;
      }

      // Fallback fuer das neuere caregiver_links-Modell (Plus-Angehoerige)
      const { data: caregiverLink } = await supabase
        .from('caregiver_links')
        .select('relationship_type')
        .eq('caregiver_id', user.id)
        .eq('resident_id', seniorId)
        .is('revoked_at', null)
        .maybeSingle();

      if (caregiverLink?.relationship_type) {
        setRole(
          mapCaregiverRelationshipToRole(caregiverLink.relationship_type) as CareUserRole
        );
      } else {
        setRole('none');
      }
      setLoading(false);
    }

    load();
  }, [seniorId]);

  return { role, loading };
}
