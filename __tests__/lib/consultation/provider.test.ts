// __tests__/lib/consultation/provider.test.ts
import { describe, it, expect } from 'vitest';
import { JitsiProvider, getProvider } from '@/lib/consultation/provider';

describe('JitsiProvider', () => {
  const provider = new JitsiProvider();

  it('sollte Name und Typ korrekt setzen', () => {
    expect(provider.name).toBe('Jitsi Meet');
    expect(provider.type).toBe('community');
  });

  it('sollte eine Room-URL mit slot-ID generieren', async () => {
    const result = await provider.createRoom('abcd1234-5678-uuid');
    expect(result.roomId).toBe('nachbar-abcd1234');
    expect(result.joinUrl).toContain('nachbar-abcd1234');
    expect(result.hostUrl).toContain('nachbar-abcd1234');
  });

  it('sollte die konfigurierte Jitsi-Base-URL verwenden', async () => {
    const customProvider = new JitsiProvider('https://video.nachbar.io');
    const result = await customProvider.createRoom('test-1234');
    expect(result.joinUrl).toBe('https://video.nachbar.io/nachbar-test-123');
  });
});

describe('getProvider', () => {
  it('sollte JitsiProvider fuer community zurueckgeben', () => {
    const provider = getProvider('community');
    expect(provider.type).toBe('community');
  });

  it('sollte MeetOneProvider fuer medical zurueckgeben', () => {
    const provider = getProvider('medical');
    expect(provider.type).toBe('medical');
  });
});
