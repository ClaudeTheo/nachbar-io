// __tests__/api/youth-consent-verify.test.ts
import { describe, it, expect } from 'vitest';
import { hashToken, isTokenExpired } from '@/lib/youth/consent';

describe('Consent Verification Logic', () => {
  it('erkennt abgelaufene Tokens', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    expect(isTokenExpired(pastDate)).toBe(true);
  });

  it('akzeptiert gueltige Tokens', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    expect(isTokenExpired(futureDate)).toBe(false);
  });

  it('validiert Token-Hash korrekt', () => {
    const token = 'test-token-12345678901234';
    const hash = hashToken(token);
    expect(hashToken(token)).toBe(hash);
    expect(hashToken('wrong-token')).not.toBe(hash);
  });
});
