// lib/care/crypto.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

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
