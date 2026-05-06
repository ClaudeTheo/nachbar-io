// lib/care/crypto.test.ts
import { createCipheriv, randomBytes } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

function encryptLegacyFormat(text: string): string {
  const keyHex = process.env.CARE_ENCRYPTION_KEY?.trim();
  if (!keyHex) throw new Error('CARE_ENCRYPTION_KEY fehlt im Test');

  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16,
  });

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `aes256gcm:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

describe('care/crypto', () => {
  it('verschluesselt und entschluesselt Text korrekt', () => {
    const original = 'Sensible Patientendaten: Diabetes Typ 2';
    const encrypted = encrypt(original);
    // Verschluesselter Text darf nicht gleich dem Original sein
    expect(encrypted).not.toBe(original);
    // Muss mit Praefix beginnen
    expect(encrypted).toMatch(/^aes256gcm:/);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('versioniert neue Ciphertexte explizit mit v1', () => {
    const encrypted = encrypt('Sensible Pflege-Notiz');

    expect(encrypted).toMatch(/^aes256gcm:v1:/);
  });

  it('entschluesselt bestehende unversionierte Ciphertexte weiterhin', () => {
    const original = 'Bestehender verschluesselter Datenbankwert';
    const legacyEncrypted = encryptLegacyFormat(original);

    expect(decrypt(legacyEncrypted)).toBe(original);
  });

  it('erzeugt unterschiedliche Ciphertexte fuer gleichen Input (IV)', () => {
    const text = 'Gleicher Text';
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);
    expect(enc1).not.toBe(enc2);
  });

  it('gibt leeren String zurueck bei leerem Input', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('wirft Fehler bei ungueltigem Ciphertext', () => {
    expect(() => decrypt('invalid-data')).toThrow();
  });
});
