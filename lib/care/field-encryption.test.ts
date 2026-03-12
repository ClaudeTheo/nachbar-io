// lib/care/field-encryption.test.ts
// Nachbar.io — Tests fuer feldbasierte Verschluesselung (DSGVO Art. 9)

import { describe, it, expect } from 'vitest';
import {
  isEncrypted,
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  decryptFieldsArray,
  CARE_PROFILES_ENCRYPTED_FIELDS,
  CARE_MEDICATIONS_ENCRYPTED_FIELDS,
  CARE_CHECKINS_ENCRYPTED_FIELDS,
  CARE_SOS_ALERTS_ENCRYPTED_FIELDS,
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS,
  CARE_APPOINTMENTS_ENCRYPTED_FIELDS,
} from './field-encryption';

describe('isEncrypted', () => {
  it('erkennt verschluesselten Wert am Praefix', () => {
    expect(isEncrypted('aes256gcm:abc:def:ghi')).toBe(true);
  });

  it('erkennt unverschluesselten Wert', () => {
    expect(isEncrypted('Klartext')).toBe(false);
    expect(isEncrypted('')).toBe(false);
  });

  it('behandelt null/undefined/number als nicht verschluesselt', () => {
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    expect(isEncrypted(42)).toBe(false);
  });
});

describe('encryptField', () => {
  it('verschluesselt einen Klartext-Wert', () => {
    const result = encryptField('Sensible Daten');
    expect(result).not.toBeNull();
    expect(result!.startsWith('aes256gcm:')).toBe(true);
  });

  it('gibt falsy zurueck bei null/undefined/leer', () => {
    expect(encryptField(null)).toBeFalsy();
    expect(encryptField(undefined)).toBeFalsy();
    expect(encryptField('')).toBeFalsy();
  });

  it('ist idempotent — verschluesselt nicht doppelt', () => {
    const encrypted = encryptField('Test')!;
    const doubleEncrypted = encryptField(encrypted);
    // Gleiches Ergebnis — wurde nicht erneut verschluesselt
    expect(doubleEncrypted).toBe(encrypted);
  });
});

describe('decryptField', () => {
  it('entschluesselt einen verschluesselten Wert', () => {
    const original = 'Medizinische Notizen: Bluthochdruck';
    const encrypted = encryptField(original)!;
    expect(decryptField(encrypted)).toBe(original);
  });

  it('gibt Klartext unveraendert zurueck (Abwaertskompatibilitaet)', () => {
    expect(decryptField('Klartext-Daten')).toBe('Klartext-Daten');
  });

  it('gibt falsy zurueck bei null/undefined', () => {
    expect(decryptField(null)).toBeFalsy();
    expect(decryptField(undefined)).toBeFalsy();
  });
});

describe('encryptFields / decryptFields', () => {
  it('verschluesselt nur angegebene Felder in einem Objekt', () => {
    const obj = {
      id: '123',
      note: 'Geheime Notiz',
      status: 'ok',
    };

    const encrypted = encryptFields(obj, ['note']);
    expect(encrypted.id).toBe('123');
    expect(encrypted.status).toBe('ok');
    expect(encrypted.note).not.toBe('Geheime Notiz');
    expect(isEncrypted(encrypted.note as string)).toBe(true);
  });

  it('mutiert nicht das Original-Objekt', () => {
    const obj = { note: 'Original' };
    const encrypted = encryptFields(obj, ['note']);
    expect(obj.note).toBe('Original');
    expect(encrypted.note).not.toBe('Original');
  });

  it('Roundtrip: encrypt -> decrypt ergibt Original', () => {
    const original = {
      id: 'abc',
      notes: 'SOS-Notfall: Sturz im Badezimmer',
      category: 'medical_emergency',
    };

    const encrypted = encryptFields(original, ['notes']);
    const decrypted = decryptFields(encrypted, ['notes']);

    expect(decrypted).toEqual(original);
  });

  it('ignoriert fehlende Felder ohne Fehler', () => {
    const obj = { id: '1', name: 'Test' };
    const result = encryptFields(obj, ['missing_field', 'also_missing']);
    expect(result).toEqual(obj);
  });

  it('ignoriert nicht-string Felder', () => {
    const obj = { id: '1', count: 42 as unknown as string };
    const result = encryptFields(obj, ['count']);
    expect(result.count).toBe(42);
  });
});

describe('decryptFieldsArray', () => {
  it('entschluesselt Felder in einem Array von Objekten', () => {
    const items = [
      { id: '1', note: encryptField('Notiz 1')! },
      { id: '2', note: encryptField('Notiz 2')! },
      { id: '3', note: null as string | null },
    ];

    const decrypted = decryptFieldsArray(items, ['note']);
    expect(decrypted[0].note).toBe('Notiz 1');
    expect(decrypted[1].note).toBe('Notiz 2');
    expect(decrypted[2].note).toBeNull();
  });

  it('gibt leeres Array zurueck bei leerem Input', () => {
    expect(decryptFieldsArray([], ['note'])).toEqual([]);
  });
});

describe('Verschluesselte Felder-Konfiguration', () => {
  it('definiert korrekte Felder fuer care_profiles', () => {
    expect(CARE_PROFILES_ENCRYPTED_FIELDS).toContain('medical_notes');
    expect(CARE_PROFILES_ENCRYPTED_FIELDS).toContain('preferred_hospital');
  });

  it('definiert korrekte Felder fuer care_medications', () => {
    expect(CARE_MEDICATIONS_ENCRYPTED_FIELDS).toContain('name');
    expect(CARE_MEDICATIONS_ENCRYPTED_FIELDS).toContain('dosage');
    expect(CARE_MEDICATIONS_ENCRYPTED_FIELDS).toContain('instructions');
  });

  it('definiert korrekte Felder fuer care_checkins', () => {
    expect(CARE_CHECKINS_ENCRYPTED_FIELDS).toContain('note');
  });

  it('definiert korrekte Felder fuer care_sos_alerts', () => {
    expect(CARE_SOS_ALERTS_ENCRYPTED_FIELDS).toContain('notes');
  });

  it('definiert korrekte Felder fuer care_sos_responses', () => {
    expect(CARE_SOS_RESPONSES_ENCRYPTED_FIELDS).toContain('note');
  });

  it('definiert korrekte Felder fuer care_appointments', () => {
    expect(CARE_APPOINTMENTS_ENCRYPTED_FIELDS).toContain('location');
    expect(CARE_APPOINTMENTS_ENCRYPTED_FIELDS).toContain('notes');
  });
});
