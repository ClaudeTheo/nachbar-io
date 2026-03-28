// __tests__/lib/youth-consent.test.ts
import { describe, it, expect } from 'vitest';
import { generateConsentToken, hashToken } from '@/modules/youth';

describe('Youth Consent', () => {
  describe('generateConsentToken', () => {
    it('generiert einen 32-Zeichen Token', () => {
      const token = generateConsentToken();
      expect(token).toHaveLength(32);
    });

    it('generiert unterschiedliche Tokens', () => {
      const t1 = generateConsentToken();
      const t2 = generateConsentToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('hashToken', () => {
    it('gibt einen SHA-256 Hex-Hash zurueck', () => {
      const hash = hashToken('test-token');
      expect(hash).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it('ist deterministisch', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'));
    });

    it('unterschiedliche Tokens = unterschiedliche Hashes', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });
});
