import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MemoryConsentType,
  MemoryActorRole,
  MemoryConsent,
  MemoryCategory,
} from '../types';

// Mapping: Consent-Typ → betroffene Kategorien
const CONSENT_TO_CATEGORIES: Record<MemoryConsentType, MemoryCategory[]> = {
  memory_basis: ['profile', 'routine', 'preference', 'contact'],
  memory_care: ['care_need'],
  memory_personal: ['personal'],
};

export async function hasConsent(
  supabase: SupabaseClient,
  userId: string,
  consentType: MemoryConsentType
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_memory_consents')
    .select('granted, revoked_at')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .single();

  if (error || !data) return false;
  return data.granted === true && data.revoked_at === null;
}

export async function getConsentStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<MemoryConsent[]> {
  const { data, error } = await supabase
    .from('user_memory_consents')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Consent-Abfrage fehlgeschlagen: ${error.message}`);
  return data || [];
}

interface ConsentAction {
  userId: string;
  consentType: MemoryConsentType;
  actorUserId: string;
  actorRole: MemoryActorRole;
}

export async function grantConsent(
  supabase: SupabaseClient,
  action: ConsentAction
): Promise<void> {
  const { error } = await supabase
    .from('user_memory_consents')
    .upsert({
      user_id: action.userId,
      consent_type: action.consentType,
      granted: true,
      granted_at: new Date().toISOString(),
      granted_by: action.actorUserId,
      revoked_at: null,
    }, { onConflict: 'user_id,consent_type' });

  if (error) throw new Error(`Consent-Erteilung fehlgeschlagen: ${error.message}`);

  // Audit-Log
  await supabase.from('user_memory_audit_log').insert({
    actor_user_id: action.actorUserId,
    actor_role: action.actorRole,
    target_user_id: action.userId,
    action: 'consent_grant',
    metadata: { consent_type: action.consentType },
  });
}

export async function revokeConsent(
  supabase: SupabaseClient,
  action: ConsentAction
): Promise<void> {
  // 1. Consent widerrufen
  const { error } = await supabase
    .from('user_memory_consents')
    .upsert({
      user_id: action.userId,
      consent_type: action.consentType,
      granted: false,
      revoked_at: new Date().toISOString(),
    }, { onConflict: 'user_id,consent_type' });

  if (error) throw new Error(`Consent-Widerruf fehlgeschlagen: ${error.message}`);

  // 2. Sofortige Kaskade: Alle Fakten dieser Kategorie loeschen
  const categories = CONSENT_TO_CATEGORIES[action.consentType];
  await supabase
    .from('user_memory_facts')
    .delete()
    .eq('user_id', action.userId)
    .in('category', categories);

  // 3. Audit-Log
  await supabase.from('user_memory_audit_log').insert({
    actor_user_id: action.actorUserId,
    actor_role: action.actorRole,
    target_user_id: action.userId,
    action: 'consent_revoke',
    metadata: { consent_type: action.consentType, categories_deleted: categories },
  });
}
