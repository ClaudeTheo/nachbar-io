// lib/organizations.ts
// Nachbar.io — Validierung und Typen fuer Organisationen (Pro Community)

// Gueltige Organisationstypen (entspricht org_type ENUM in Migration 073)
export const ORG_TYPES = ['municipality', 'care_service', 'housing', 'social_service'] as const;
export type OrgType = (typeof ORG_TYPES)[number];

// Gueltige Mitgliederrollen (entspricht org_member_role ENUM in Migration 073)
export const ORG_MEMBER_ROLES = ['admin', 'viewer'] as const;
export type OrgMemberRole = (typeof ORG_MEMBER_ROLES)[number];

// Eingabetypen
export interface OrgCreateInput {
  name: string;
  type: OrgType;
  hr_vr_number: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

export interface OrgMemberInput {
  user_id: string;
  role: OrgMemberRole;
  assigned_quarters?: string[];
}

// Validierungsergebnis
interface ValidationResult {
  valid: boolean;
  error?: string;
}

// E-Mail-Regex (RFC 5322 vereinfacht)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// UUID-Regex (v4)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validiert die Eingabe fuer das Erstellen einer Organisation.
 * Prueft: name, type, hr_vr_number, contact_email
 */
export function validateOrgCreate(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Ungueltige Anfrage' };
  }

  const data = body as Record<string, unknown>;

  // Name: Pflichtfeld, 2-200 Zeichen
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    return { valid: false, error: 'Name muss mindestens 2 Zeichen lang sein' };
  }
  if (data.name.trim().length > 200) {
    return { valid: false, error: 'Name darf maximal 200 Zeichen lang sein' };
  }

  // Typ: Pflichtfeld, muss gueltiger Organisationstyp sein
  if (!data.type || typeof data.type !== 'string') {
    return { valid: false, error: 'Organisationstyp ist erforderlich' };
  }
  if (!ORG_TYPES.includes(data.type as OrgType)) {
    return {
      valid: false,
      error: `Ungueltiger Organisationstyp. Erlaubt: ${ORG_TYPES.join(', ')}`,
    };
  }

  // HR/VR-Nummer: Pflichtfeld, 3-50 Zeichen
  if (!data.hr_vr_number || typeof data.hr_vr_number !== 'string' || data.hr_vr_number.trim().length < 3) {
    return { valid: false, error: 'Handelsregister-/Vereinsregisternummer ist erforderlich (min. 3 Zeichen)' };
  }
  if (data.hr_vr_number.trim().length > 50) {
    return { valid: false, error: 'Registernummer darf maximal 50 Zeichen lang sein' };
  }

  // Kontakt-E-Mail: Pflichtfeld, gueltiges Format
  if (!data.contact_email || typeof data.contact_email !== 'string') {
    return { valid: false, error: 'Kontakt-E-Mail ist erforderlich' };
  }
  if (!EMAIL_REGEX.test(data.contact_email.trim())) {
    return { valid: false, error: 'Ungueltige E-Mail-Adresse' };
  }

  return { valid: true };
}

/**
 * Validiert die Eingabe fuer das Hinzufuegen eines Org-Mitglieds.
 * Prueft: user_id (UUID), role (admin/viewer)
 */
export function validateOrgMemberAdd(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Ungueltige Anfrage' };
  }

  const data = body as Record<string, unknown>;

  // user_id: Pflichtfeld, gueltige UUID
  if (!data.user_id || typeof data.user_id !== 'string') {
    return { valid: false, error: 'Benutzer-ID ist erforderlich' };
  }
  if (!UUID_REGEX.test(data.user_id)) {
    return { valid: false, error: 'Ungueltige Benutzer-ID (UUID erwartet)' };
  }

  // Rolle: Pflichtfeld, muss admin oder viewer sein
  if (!data.role || typeof data.role !== 'string') {
    return { valid: false, error: 'Rolle ist erforderlich' };
  }
  if (!ORG_MEMBER_ROLES.includes(data.role as OrgMemberRole)) {
    return {
      valid: false,
      error: `Ungueltige Rolle. Erlaubt: ${ORG_MEMBER_ROLES.join(', ')}`,
    };
  }

  return { valid: true };
}
