// lib/care/permissions.ts
// Rollenbasierte Berechtigungspruefung fuer das Care-Modul

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CareHelperRole,
  CareUserRole,
  CaregiverRelationshipType,
} from './types';
import { hasFeature } from './constants';
import type { CareSubscriptionPlan } from './types';

export function mapCaregiverRelationshipToRole(
  relationshipType: CaregiverRelationshipType
): CareHelperRole {
  return relationshipType === 'volunteer' ? 'neighbor' : 'relative';
}

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
    .maybeSingle();

  if (helper && helper.role) {
    // Pruefe ob der Senior in assigned_seniors ist
    const { data: helperFull } = await supabase
      .from('care_helpers')
      .select('assigned_seniors')
      .eq('user_id', user.id)
      .maybeSingle();

    if (helperFull?.assigned_seniors?.includes(seniorId)) {
      return helper.role as CareHelperRole;
    }
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
    return mapCaregiverRelationshipToRole(
      caregiverLink.relationship_type as CaregiverRelationshipType
    );
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
    .maybeSingle();

  // Kein Abo = free Plan
  const plan: CareSubscriptionPlan = subscription?.plan ?? 'free';
  const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trial';

  if (!isActive) return false;

  return hasFeature(plan, feature);
}
