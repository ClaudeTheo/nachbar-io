// lib/care/permissions.ts
// Rollenbasierte Berechtigungspruefung fuer das Care-Modul

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareHelperRole, CareUserRole } from './types';
import { hasFeature } from './constants';
import type { CareSubscriptionPlan } from './types';

/**
 * Ermittelt die aktive Care-Rolle des eingeloggten Users
 * im Kontext eines bestimmten Seniors.
 */
export async function getCareRole(
  supabase: SupabaseClient,
  seniorId: string
): Promise<CareUserRole> {
  // Aktuellen User holen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'none';

  // Ist der User selbst der Senior?
  if (user.id === seniorId) return 'senior';

  // Ist der User Admin?
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (userData?.is_admin) return 'admin';

  // Ist der User ein Helfer fuer diesen Senior?
  const { data: helper } = await supabase
    .from('care_helpers')
    .select('role')
    .eq('user_id', user.id)
    .eq('verification_status', 'verified')
    .single();

  if (helper && helper.role) {
    // Pruefe ob der Senior in assigned_seniors ist
    const { data: helperFull } = await supabase
      .from('care_helpers')
      .select('assigned_seniors')
      .eq('user_id', user.id)
      .single();

    if (helperFull?.assigned_seniors?.includes(seniorId)) {
      return helper.role as CareHelperRole;
    }
  }

  return 'none';
}

/**
 * Prueft ob der aktuelle User Zugriff auf ein bestimmtes Feature hat,
 * basierend auf dem Abo-Plan des Seniors.
 */
export async function canAccessFeature(
  supabase: SupabaseClient,
  seniorId: string,
  feature: string
): Promise<boolean> {
  // Medizinischer Notfall ist immer verfuegbar (Sicherheitspflicht)
  if (feature === 'medical_emergency_sos') return true;

  const { data: subscription } = await supabase
    .from('care_subscriptions')
    .select('plan, status')
    .eq('user_id', seniorId)
    .single();

  // Kein Abo = free Plan
  const plan: CareSubscriptionPlan = subscription?.plan ?? 'free';
  const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trial';

  if (!isActive) return false;

  return hasFeature(plan, feature);
}
