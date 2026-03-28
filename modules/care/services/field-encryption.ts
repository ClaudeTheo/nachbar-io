// lib/care/field-encryption.ts
// Feld-basierte Verschluesselung fuer Art. 9 DSGVO Gesundheitsdaten
// Nutzt AES-256-GCM aus lib/care/crypto.ts

import { encrypt, decrypt } from './crypto';

// Praefix fuer verschluesselte Werte (muss mit crypto.ts uebereinstimmen)
const ENCRYPTED_PREFIX = 'aes256gcm:';

/**
 * Prueft ob ein Wert bereits verschluesselt ist.
 */
export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Verschluesselt einen Wert, wenn er noch nicht verschluesselt ist.
 * Null/undefined/leere Strings werden unveraendert zurueckgegeben.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return value as null;
  if (isEncrypted(value)) return value; // Bereits verschluesselt — idempotent
  return encrypt(value);
}

/**
 * Entschluesselt einen Wert. Wenn der Wert nicht verschluesselt ist
 * (kein aes256gcm: Praefix), wird er als Klartext zurueckgegeben.
 * Das ermoeglicht Abwaertskompatibilitaet waehrend der Migration.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return value as null;
  if (!isEncrypted(value)) return value; // Klartext — noch nicht migriert
  return decrypt(value);
}

// --- Konfiguration: Welche Felder pro Tabelle verschluesselt werden ---

/**
 * Felder in care_profiles, die verschluesselt werden muessen.
 * Sensitivitaet: SEHR HOCH (medizinische Freitexte, Versicherungsdaten)
 */
export const CARE_PROFILES_ENCRYPTED_FIELDS = [
  'medical_notes',
  'preferred_hospital',
  'insurance_number',
] as const;

/**
 * Felder in care_medications, die verschluesselt werden muessen.
 * Sensitivitaet: HOCH (Medikamenten-Name, Dosierung, Anweisungen)
 */
export const CARE_MEDICATIONS_ENCRYPTED_FIELDS = [
  'name',
  'dosage',
  'instructions',
] as const;

/**
 * Felder in care_checkins, die verschluesselt werden muessen.
 * Sensitivitaet: HOCH (persoenliche Notizen zum Befinden)
 */
export const CARE_CHECKINS_ENCRYPTED_FIELDS = [
  'note',
] as const;

/**
 * Felder in care_sos_alerts, die verschluesselt werden muessen.
 * Sensitivitaet: HOCH (Notfall-Notizen)
 */
export const CARE_SOS_ALERTS_ENCRYPTED_FIELDS = [
  'notes',
] as const;

/**
 * Felder in care_sos_responses, die verschluesselt werden muessen.
 * Sensitivitaet: MITTEL (Helfer-Notizen)
 */
export const CARE_SOS_RESPONSES_ENCRYPTED_FIELDS = [
  'note',
] as const;

/**
 * Felder in care_appointments, die verschluesselt werden muessen.
 * Sensitivitaet: MITTEL (Ortsangaben, Notizen)
 */
export const CARE_APPOINTMENTS_ENCRYPTED_FIELDS = [
  'location',
  'notes',
] as const;

// --- Generische Helfer fuer Objekt-Verschluesselung/Entschluesselung ---

/**
 * Verschluesselt die angegebenen Felder in einem Objekt.
 * Gibt ein neues Objekt zurueck (kein In-Place-Mutation).
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldNames: readonly string[]
): T {
  const result = { ...obj };
  for (const field of fieldNames) {
    if (field in result && result[field] !== undefined) {
      const value = result[field];
      if (typeof value === 'string') {
        (result as Record<string, unknown>)[field] = encryptField(value);
      }
    }
  }
  return result;
}

/**
 * Entschluesselt die angegebenen Felder in einem Objekt.
 * Gibt ein neues Objekt zurueck (kein In-Place-Mutation).
 * Abwaertskompatibel: Klartext-Werte werden unveraendert zurueckgegeben.
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldNames: readonly string[]
): T {
  const result = { ...obj };
  for (const field of fieldNames) {
    if (field in result && result[field] !== undefined) {
      const value = result[field];
      if (typeof value === 'string') {
        (result as Record<string, unknown>)[field] = decryptField(value);
      }
    }
  }
  return result;
}

/**
 * Entschluesselt Felder in einem Array von Objekten.
 */
export function decryptFieldsArray<T extends Record<string, unknown>>(
  items: T[],
  fieldNames: readonly string[]
): T[] {
  return items.map(item => decryptFields(item, fieldNames));
}
