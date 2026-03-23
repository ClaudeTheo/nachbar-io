import { describe, it, expect } from 'vitest';
import { getPasskeyConfig, generatePasskeySecret } from '@/lib/auth/passkey';

describe('passkey config', () => {
  it('returns rpName and rpID', () => {
    const config = getPasskeyConfig();
    expect(config.rpName).toBe('nachbar.io');
    expect(config.rpID).toBeDefined();
    expect(config.origin).toBeDefined();
  });
});

describe('generatePasskeySecret', () => {
  it('returns a 64-char hex string', () => {
    const secret = generatePasskeySecret();
    expect(secret).toHaveLength(64);
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique secrets', () => {
    const a = generatePasskeySecret();
    const b = generatePasskeySecret();
    expect(a).not.toBe(b);
  });
});
