// Kategorien
export type MemoryCategory =
  | 'profile'
  | 'routine'
  | 'preference'
  | 'contact'
  | 'care_need'
  | 'personal';

export type MemoryConsentLevel = 'basis' | 'care' | 'personal';
export type MemoryVisibility = 'private' | 'care_team';
export type MemorySource = 'self' | 'caregiver' | 'ai_learned' | 'care_team';
export type MemoryConsentType = 'memory_basis' | 'memory_care' | 'memory_personal';
export type MemoryActorRole = 'senior' | 'caregiver' | 'ai' | 'care_team' | 'system';
export type MemoryAuditAction =
  | 'create' | 'update' | 'delete' | 'reset'
  | 'consent_grant' | 'consent_revoke';

export type AssistantContext =
  | 'free_chat'
  | 'plus_chat'
  | 'kiosk_public'
  | 'kiosk_plus'
  | 'care_team';

// DB-Zeilen
export interface MemoryFact {
  id: string;
  user_id: string;
  category: MemoryCategory;
  consent_level: MemoryConsentLevel;
  key: string;
  value: string;
  value_encrypted: boolean;
  visibility: MemoryVisibility;
  org_id: string | null;
  source: MemorySource;
  source_user_id: string | null;
  confidence: number | null;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemoryConsent {
  id: string;
  user_id: string;
  consent_type: MemoryConsentType;
  granted: boolean;
  granted_at: string | null;
  granted_by: string | null;
  revoked_at: string | null;
}

export interface MemoryAuditEntry {
  id: string;
  actor_user_id: string;
  actor_role: MemoryActorRole;
  target_user_id: string;
  action: MemoryAuditAction;
  fact_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// API Request/Response
export interface MemoryFactInput {
  category: MemoryCategory;
  key: string;
  value: string;
  targetUserId?: string; // Fuer Caregiver
  visibility?: MemoryVisibility;
  org_id?: string;
}

export interface MemorySaveProposal {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  needs_confirmation: boolean;
}

export interface SaveDecision {
  allowed: boolean;
  mode?: 'save' | 'update' | 'confirm';
  id?: string;
  reason?: string;
}

export interface MemoryApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// Consent-Level Mapping
export const CATEGORY_TO_CONSENT: Record<MemoryCategory, MemoryConsentType> = {
  profile: 'memory_basis',
  routine: 'memory_basis',
  preference: 'memory_basis',
  contact: 'memory_basis',
  care_need: 'memory_care',
  personal: 'memory_personal',
};

// Sensitive Kategorien (verschluesselt)
export const SENSITIVE_CATEGORIES: MemoryCategory[] = ['care_need', 'personal'];

// Basis Kategorien (Klartext)
export const BASIS_CATEGORIES: MemoryCategory[] = [
  'profile', 'routine', 'preference', 'contact'
];

// Limits
export const MEMORY_LIMITS = {
  BASIS_MAX: 50,
  SENSITIVE_MAX: 20,
  TOTAL_MAX: 70,
  AUTO_SAVE_MIN_CONFIDENCE: 0.8,
} as const;
