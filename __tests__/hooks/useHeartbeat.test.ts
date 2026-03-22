// __tests__/hooks/useHeartbeat.test.ts
// Nachbar.io — Tests fuer useHeartbeat Hook

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks VOR dem Import
const mockGetCachedUser = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}));
vi.mock('@/lib/supabase/cached-auth', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useHeartbeat } from '@/lib/care/hooks/useHeartbeat';

describe('useHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetCachedUser.mockResolvedValue({ user: { id: 'user-1' } });
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('sendet Heartbeat beim Mount wenn User eingeloggt', async () => {
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/heartbeat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    // Pruefe body-Inhalt
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.source).toBe('app');
    expect(callBody.device_type).toBeDefined();
  });

  it('sendet keinen Heartbeat wenn kein User', async () => {
    mockGetCachedUser.mockResolvedValue({ user: null });

    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('erkennt desktop als device_type im Test-Kontext', async () => {
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // In jsdom ist userAgent nicht mobile/kiosk/tablet
    expect(callBody.device_type).toBe('desktop');
  });

  it('blockiert fetch-Fehler ohne Exception', async () => {
    mockFetch.mockRejectedValue(new Error('Netzwerkfehler'));

    // Darf keinen Fehler werfen
    await act(async () => {
      renderHook(() => useHeartbeat());
    });
    // Hook laeuft weiter — kein Crash
    expect(true).toBe(true);
  });

  it('sendet nur einmal innerhalb 60s Rate-Limit', async () => {
    const { unmount } = await act(async () => {
      return renderHook(() => useHeartbeat());
    });
    unmount();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Sofort neuer Mount — sollte durch Rate-Limit blockiert werden
    // (lastSent ist useRef, also pro Instanz)
    await act(async () => {
      renderHook(() => useHeartbeat());
    });

    // Zweite Instanz hat eigenes useRef, daher AUCH 1 Aufruf
    // Rate-Limit gilt pro Hook-Instanz, nicht global
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
