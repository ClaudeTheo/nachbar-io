import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIceServers, isConnectionDegraded } from '../peer-connection';

describe('getIceServers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('gibt Google STUN zurück wenn kein TURN konfiguriert', () => {
    const servers = getIceServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].urls).toContain('stun:stun.l.google.com:19302');
  });

  it('fügt TURN-Server hinzu wenn Environment-Variablen gesetzt', () => {
    vi.stubEnv('NEXT_PUBLIC_TURN_URL', 'turn:eu.metered.ca:443');
    vi.stubEnv('NEXT_PUBLIC_TURN_USERNAME', 'test-user');
    vi.stubEnv('NEXT_PUBLIC_TURN_CREDENTIAL', 'test-cred');

    const servers = getIceServers();
    expect(servers).toHaveLength(2);
    expect(servers[1]).toEqual({
      urls: 'turn:eu.metered.ca:443',
      username: 'test-user',
      credential: 'test-cred',
    });
  });

  it('ignoriert TURN wenn URL fehlt', () => {
    vi.stubEnv('NEXT_PUBLIC_TURN_USERNAME', 'test-user');
    vi.stubEnv('NEXT_PUBLIC_TURN_CREDENTIAL', 'test-cred');

    const servers = getIceServers();
    expect(servers).toHaveLength(1);
  });
});

describe('isConnectionDegraded', () => {
  it('gibt true zurück bei "disconnected"', () => {
    expect(isConnectionDegraded('disconnected')).toBe(true);
  });

  it('gibt true zurück bei "failed"', () => {
    expect(isConnectionDegraded('failed')).toBe(true);
  });

  it('gibt false zurück bei "connected"', () => {
    expect(isConnectionDegraded('connected')).toBe(false);
  });
});
