// lib/care/consent.ts
// Art. 9 Einwilligungsmanagement — Helper-Funktionen

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareConsentFeature } from './types';
import { CONSENT_FEATURES } from './types';
import { CURRENT_CONSENT_VERSION } from './constants';

// Mapping: Welcher Consent wird fuer welche API-Routen benoetigt?
export const CONSENT_FEATURE_TO_API_ROUTES: Record<CareConsentFeature, string[]> = {
  sos: ['/api/care/sos'],
  checkin: ['/api/care/checkin', '/api/care/checkin/status'],
  medications: ['/api/care/medications', '/api/care/medications/due'],
  care_profile: ['/api/care/profile'],
  emergency_contacts: ['/api/care/profile'],
};

// Prueft ob ein Nutzer fuer ein bestimmtes Feature eingewilligt hat
export async function checkCareConsent(
  supabase: SupabaseClient,
  userId: string,
  feature: CareConsentFeature,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('care_consents')
    .select('granted')
    .eq('user_id', userId)
    .eq('feature', feature)
    .maybeSingle();

  if (error || !data) return false;
  return data.granted === true;
}

// Laedt alle Consents eines Nutzers
export async function getConsentsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<CareConsentFeature, { granted: boolean; granted_at: string | null; consent_version: string }>> {
  const { data, error } = await supabase
    .from('care_consents')
    .select('feature, granted, granted_at, consent_version')
    .eq('user_id', userId);

  const defaults: Record<string, { granted: boolean; granted_at: string | null; consent_version: string }> = {};
  for (const f of CONSENT_FEATURES) {
    defaults[f] = { granted: false, granted_at: null, consent_version: CURRENT_CONSENT_VERSION };
  }

  if (error || !data) return defaults as Record<CareConsentFeature, { granted: boolean; granted_at: string | null; consent_version: string }>;

  for (const row of data) {
    if (row.feature in defaults) {
      defaults[row.feature] = {
        granted: row.granted,
        granted_at: row.granted_at,
        consent_version: row.consent_version,
      };
    }
  }

  return defaults as Record<CareConsentFeature, { granted: boolean; granted_at: string | null; consent_version: string }>;
}

// Prueft ob der Nutzer mindestens einen Consent erteilt hat
export async function hasAnyCareConsent(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('care_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('granted', true)
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}
