import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MemoryFact,
  MemoryFactInput,
  MemorySaveProposal,
  SaveDecision,
  MemoryCategory,
  MemoryActorRole,
} from '../types';
import {
  SENSITIVE_CATEGORIES,
  MEMORY_LIMITS,
  CATEGORY_TO_CONSENT,
} from '../types';
import { containsMedicalTerms } from './medical-blocklist';
import { encryptField, decryptField } from '@/lib/care/field-encryption';

interface ValidationContext {
  hasConsent: boolean;
  factCount: number;
  maxFacts: number;
}

// Reine Validierung (kein DB-Zugriff, testbar)
export function validateMemorySave(
  proposal: MemorySaveProposal,
  context: ValidationContext
): SaveDecision {
  // Stufe 1: Limit
  if (context.factCount >= context.maxFacts) {
    return { allowed: false, reason: 'limit_reached' };
  }

  // Stufe 2: Consent fuer sensitive Kategorien
  if (SENSITIVE_CATEGORIES.includes(proposal.category) && !context.hasConsent) {
    return { allowed: false, reason: 'no_consent' };
  }

  // Stufe 3: Medizin-Blocklist (letzter Guard)
  if (containsMedicalTerms(proposal.value)) {
    return { allowed: false, reason: 'medical_blocked' };
  }

  // Stufe 4: Auto-Save oder Bestaetigung?
  // Sensitive Kategorien: immer bestaetigen
  if (SENSITIVE_CATEGORIES.includes(proposal.category)) {
    return { allowed: true, mode: 'confirm' };
  }

  // Niedrige Confidence oder explizit angefragt: bestaetigen
  if (proposal.needs_confirmation || proposal.confidence < MEMORY_LIMITS.AUTO_SAVE_MIN_CONFIDENCE) {
    return { allowed: true, mode: 'confirm' };
  }

  return { allowed: true, mode: 'save' };
}

// DB-Operationen
export async function getFacts(
  supabase: SupabaseClient,
  userId: string,
  filters?: {
    category?: MemoryCategory;
    visibility?: 'private' | 'care_team';
    source?: string;
  }
): Promise<MemoryFact[]> {
  let query = supabase
    .from('user_memory_facts')
    .select('*')
    .eq('user_id', userId)
    .order('category')
    .order('updated_at', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.visibility) query = query.eq('visibility', filters.visibility);
  if (filters?.source) query = query.eq('source', filters.source);

  const { data, error } = await query;
  if (error) throw new Error(`Fakten-Abfrage fehlgeschlagen: ${error.message}`);

  // Sensitive Werte entschluesseln
  return (data || []).map((fact) => {
    if (fact.value_encrypted) {
      try {
        return { ...fact, value: decryptField(fact.value) };
      } catch {
        return { ...fact, value: '[Entschluesselung fehlgeschlagen]' };
      }
    }
    return fact;
  });
}

export async function getFactsByCategory(
  supabase: SupabaseClient,
  userId: string,
  categories: MemoryCategory[]
): Promise<MemoryFact[]> {
  const { data, error } = await supabase
    .from('user_memory_facts')
    .select('*')
    .eq('user_id', userId)
    .in('category', categories);

  if (error) throw new Error(`Fakten-Abfrage fehlgeschlagen: ${error.message}`);
  return data || [];
}

export async function getFactCount(
  supabase: SupabaseClient,
  userId: string,
  sensitive: boolean
): Promise<number> {
  const categories = sensitive
    ? SENSITIVE_CATEGORIES
    : ['profile', 'routine', 'preference', 'contact'];

  const { count, error } = await supabase
    .from('user_memory_facts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('category', categories as string[]);

  if (error) return 0;
  return count || 0;
}

export async function saveFact(
  supabase: SupabaseClient,
  input: MemoryFactInput & {
    source: 'self' | 'caregiver' | 'ai_learned' | 'care_team';
    sourceUserId: string;
    confidence?: number;
    confirmed?: boolean;
  }
): Promise<MemoryFact> {
  const targetUserId = input.targetUserId || input.sourceUserId;
  const isSensitive = SENSITIVE_CATEGORIES.includes(input.category);
  const value = isSensitive ? encryptField(input.value) : input.value;

  // Duplikat-Check (user_id + category + key)
  const { data: existing } = await supabase
    .from('user_memory_facts')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('category', input.category)
    .eq('key', input.key)
    .single();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('user_memory_facts')
      .update({
        value,
        value_encrypted: isSensitive,
        source: input.source,
        source_user_id: input.sourceUserId,
        confidence: input.confidence ?? null,
        confirmed: input.confirmed ?? false,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Fakt-Update fehlgeschlagen: ${error.message}`);

    // Audit
    await logAudit(supabase, {
      actorUserId: input.sourceUserId,
      actorRole: sourceToActorRole(input.source),
      targetUserId,
      action: 'update',
      factId: existing.id,
      metadata: { category: input.category, key: input.key },
    });

    return data;
  }

  // Insert
  const { data, error } = await supabase
    .from('user_memory_facts')
    .insert({
      user_id: targetUserId,
      category: input.category,
      consent_level: CATEGORY_TO_CONSENT[input.category].replace('memory_', '') as any,
      key: input.key,
      value,
      value_encrypted: isSensitive,
      visibility: input.visibility || 'private',
      org_id: input.org_id || null,
      source: input.source,
      source_user_id: input.sourceUserId,
      confidence: input.confidence ?? null,
      confirmed: input.confirmed ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(`Fakt-Speicherung fehlgeschlagen: ${error.message}`);

  // Audit
  await logAudit(supabase, {
    actorUserId: input.sourceUserId,
    actorRole: sourceToActorRole(input.source),
    targetUserId,
    action: 'create',
    factId: data.id,
    metadata: { category: input.category, key: input.key },
  });

  return data;
}

export async function deleteFact(
  supabase: SupabaseClient,
  factId: string,
  actorUserId: string,
  actorRole: MemoryActorRole
): Promise<void> {
  const { data: fact } = await supabase
    .from('user_memory_facts')
    .select('user_id, category, key')
    .eq('id', factId)
    .single();

  const { error } = await supabase
    .from('user_memory_facts')
    .delete()
    .eq('id', factId);

  if (error) throw new Error(`Fakt-Loeschung fehlgeschlagen: ${error.message}`);

  if (fact) {
    await logAudit(supabase, {
      actorUserId,
      actorRole,
      targetUserId: fact.user_id,
      action: 'delete',
      factId,
      metadata: { category: fact.category, key: fact.key },
    });
  }
}

export async function resetFacts(
  supabase: SupabaseClient,
  userId: string,
  scope: 'basis' | 'care_need' | 'personal' | 'all',
  actorUserId: string,
  actorRole: MemoryActorRole
): Promise<void> {
  const categories: MemoryCategory[] = scope === 'all'
    ? ['profile', 'routine', 'preference', 'contact', 'care_need', 'personal']
    : scope === 'basis'
      ? ['profile', 'routine', 'preference', 'contact']
      : [scope];

  const { error } = await supabase
    .from('user_memory_facts')
    .delete()
    .eq('user_id', userId)
    .in('category', categories);

  if (error) throw new Error(`Memory-Reset fehlgeschlagen: ${error.message}`);

  await logAudit(supabase, {
    actorUserId,
    actorRole,
    targetUserId: userId,
    action: 'reset',
    metadata: { scope, categories },
  });
}

// Hilfsfunktionen
function sourceToActorRole(source: string): MemoryActorRole {
  switch (source) {
    case 'ai_learned': return 'ai';
    case 'caregiver': return 'caregiver';
    case 'care_team': return 'care_team';
    default: return 'senior';
  }
}

async function logAudit(
  supabase: SupabaseClient,
  entry: {
    actorUserId: string;
    actorRole: MemoryActorRole;
    targetUserId: string;
    action: string;
    factId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from('user_memory_audit_log').insert({
    actor_user_id: entry.actorUserId,
    actor_role: entry.actorRole,
    target_user_id: entry.targetUserId,
    action: entry.action,
    fact_id: entry.factId || null,
    metadata: entry.metadata || {},
  });
}
