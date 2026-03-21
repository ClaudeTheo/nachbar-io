// Tests fuer Apple Sign-In Helper
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase Client
const mockSignInWithOAuth = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      getSession: mockGetSession,
    },
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('signInWithApple', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.location.origin Mock
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://quartierapp.de' },
      writable: true,
    });
  });

  it('ruft Supabase OAuth mit Apple-Provider auf', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://apple.com/auth' }, error: null });

    const { signInWithApple } = await import('@/lib/auth/apple');
    const { data, error } = await signInWithApple();

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'apple',
      options: {
        redirectTo: 'https://quartierapp.de/auth/callback',
      },
    });
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('gibt Fehler zurueck bei OAuth-Fehler', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Provider nicht konfiguriert' },
    });

    const { signInWithApple } = await import('@/lib/auth/apple');
    const { error } = await signInWithApple();

    expect(error).toBeDefined();
    expect(error?.message).toBe('Provider nicht konfiguriert');
  });
});

describe('revokeAppleToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendet Token-Revocation-Request wenn Provider-Token vorhanden', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { provider_token: 'apple_token_123' } },
    });
    mockFetch.mockResolvedValue({ ok: true });

    const { revokeAppleToken } = await import('@/lib/auth/apple');
    const result = await revokeAppleToken();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/apple-revoke', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'apple_token_123' }),
    }));
    expect(result).toBe(true);
  });

  it('gibt true zurueck wenn kein Provider-Token vorhanden', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { provider_token: null } },
    });

    const { revokeAppleToken } = await import('@/lib/auth/apple');
    const result = await revokeAppleToken();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('gibt false zurueck bei Netzwerkfehler', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { provider_token: 'apple_token_123' } },
    });
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { revokeAppleToken } = await import('@/lib/auth/apple');
    const result = await revokeAppleToken();

    expect(result).toBe(false);
  });
});
