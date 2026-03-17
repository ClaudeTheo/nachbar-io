import { describe, it, expect } from 'vitest';
import { getPresenceChannelName, isUserOnline, PRESENCE_TIMEOUT_MS } from '../presence';

describe('getPresenceChannelName', () => {
  it('gibt korrekten Kanal für Terminal zurück', () => {
    expect(getPresenceChannelName('terminal', 'hh-123')).toBe('presence:terminal:hh-123');
  });

  it('gibt korrekten Kanal für User zurück', () => {
    expect(getPresenceChannelName('user', 'user-456')).toBe('presence:user:user-456');
  });
});

describe('isUserOnline', () => {
  it('gibt true zurück wenn lastSeen innerhalb Timeout', () => {
    const now = Date.now();
    const recent = new Date(now - 30_000).toISOString(); // 30s her
    expect(isUserOnline(recent, now)).toBe(true);
  });

  it('gibt false zurück wenn lastSeen älter als Timeout', () => {
    const now = Date.now();
    const old = new Date(now - PRESENCE_TIMEOUT_MS - 1000).toISOString();
    expect(isUserOnline(old, now)).toBe(false);
  });

  it('gibt false zurück wenn lastSeen null', () => {
    expect(isUserOnline(null, Date.now())).toBe(false);
  });

  it('Timeout ist 60 Sekunden', () => {
    expect(PRESENCE_TIMEOUT_MS).toBe(60_000);
  });
});
