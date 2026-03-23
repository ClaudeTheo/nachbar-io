// __tests__/auth/passkey-login.test.ts
// Tests fuer extrahierte Passkey-Login-Logik

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { handlePasskeyLogin } from '@/lib/auth/passkey-login';

// Mock fuer fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Hilfsfunktion: Supabase-Client Mock erstellen
function createMockSupabase(overrides?: {
  setSessionError?: { message: string } | null;
  getUserError?: { message: string } | null;
  getUserData?: { user: { id: string } } | null;
}) {
  return {
    auth: {
      setSession: vi.fn().mockResolvedValue({
        error: overrides?.setSessionError ?? null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: overrides?.getUserData ?? { user: { id: 'user-123' } },
        error: overrides?.getUserError ?? null,
      }),
    },
  };
}

// Hilfsfunktion: WebAuthn-Modul Mock
function createMockWebAuthn() {
  return {
    startAuthentication: vi.fn().mockResolvedValue({ id: 'cred-1', response: {} }),
    startRegistration: vi.fn(),
    browserSupportsWebAuthn: vi.fn().mockReturnValue(true),
    browserSupportsWebAuthnAutofill: vi.fn(),
    platformAuthenticatorIsAvailable: vi.fn(),
    base64URLStringToBuffer: vi.fn(),
    bufferToBase64URLString: vi.fn(),
    WebAuthnAbortService: {} as never,
    WebAuthnError: class extends Error {} as never,
  } as unknown as typeof import('@simplewebauthn/browser');
}

describe('handlePasskeyLogin', () => {
  let setError: Mock<(error: string | null) => void>;
  let setLoading: Mock<(loading: boolean) => void>;
  let routerPush: Mock;
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockWebAuthn: ReturnType<typeof createMockWebAuthn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setError = vi.fn();
    setLoading = vi.fn();
    routerPush = vi.fn();
    mockSupabase = createMockSupabase();
    mockWebAuthn = createMockWebAuthn();
  });

  // Standard-Params fuer jeden Test
  function getParams(overrides?: Partial<Parameters<typeof handlePasskeyLogin>[0]>) {
    return {
      webauthnModule: mockWebAuthn,
      setError,
      setLoading,
      createClient: () => mockSupabase as never,
      router: { push: routerPush } as never,
      ...overrides,
    };
  }

  // --- Erfolgsfall ---

  it('setzt Session + verifiziert + leitet weiter bei Erfolg', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          redirect: '/dashboard',
          session: { access_token: 'at', refresh_token: 'rt' },
        }),
      });

    await handlePasskeyLogin(getParams());

    // setSession aufgerufen
    expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
    // getUser zur Verifikation aufgerufen
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    // Redirect nach Verifikation
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
    expect(setError).not.toHaveBeenCalledWith(expect.any(String));
  });

  // --- Error Surfacing: login-begin fehlschlaegt ---

  it('zeigt Fehler wenn login-begin fehlschlaegt', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    await handlePasskeyLogin(getParams());

    expect(setError).toHaveBeenCalledWith('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    expect(setLoading).toHaveBeenLastCalledWith(false);
    expect(routerPush).not.toHaveBeenCalled();
  });

  // --- Error Surfacing: login-complete fehlschlaegt ---

  it('zeigt generischen Fehler wenn login-complete fehlschlaegt', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

    await handlePasskeyLogin(getParams());

    expect(setError).toHaveBeenCalledWith('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('zeigt spezifische Server-Fehlermeldung wenn vorhanden', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Passkey abgelaufen. Bitte neu registrieren.' }),
      });

    await handlePasskeyLogin(getParams());

    expect(setError).toHaveBeenCalledWith('Passkey abgelaufen. Bitte neu registrieren.');
    expect(routerPush).not.toHaveBeenCalled();
  });

  // --- Session-Verifikation ---

  it('zeigt Fehler wenn setSession fehlschlaegt', async () => {
    mockSupabase = createMockSupabase({ setSessionError: { message: 'invalid token' } });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          redirect: '/dashboard',
          session: { access_token: 'at', refresh_token: 'rt' },
        }),
      });

    await handlePasskeyLogin(getParams());

    expect(setError).toHaveBeenCalledWith('Sitzung konnte nicht erstellt werden. Bitte mit E-Mail anmelden.');
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('zeigt Fehler wenn getUser nach setSession fehlschlaegt', async () => {
    mockSupabase = createMockSupabase({
      getUserError: { message: 'session expired' },
      getUserData: { user: null as never },
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          redirect: '/dashboard',
          session: { access_token: 'at', refresh_token: 'rt' },
        }),
      });

    await handlePasskeyLogin(getParams());

    expect(setError).toHaveBeenCalledWith('Sitzung konnte nicht verifiziert werden. Bitte mit E-Mail anmelden.');
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('ruft getUser NACH setSession auf (Reihenfolge)', async () => {
    const callOrder: string[] = [];
    mockSupabase.auth.setSession = vi.fn().mockImplementation(async () => {
      callOrder.push('setSession');
      return { error: null };
    });
    mockSupabase.auth.getUser = vi.fn().mockImplementation(async () => {
      callOrder.push('getUser');
      return { data: { user: { id: 'u1' } }, error: null };
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          redirect: '/dashboard',
          session: { access_token: 'at', refresh_token: 'rt' },
        }),
      });

    await handlePasskeyLogin(getParams());

    expect(callOrder).toEqual(['setSession', 'getUser']);
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
  });

  // --- NotAllowedError (User-Abbruch) ---

  it('zeigt KEINEN Fehler bei NotAllowedError (User-Abbruch)', async () => {
    // DOMException mit name='NotAllowedError' (Browser-Verhalten simulieren)
    const notAllowedError = Object.assign(new Error('User cancelled'), { name: 'NotAllowedError' });
    mockWebAuthn.startAuthentication = vi.fn().mockRejectedValue(notAllowedError);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) });

    await handlePasskeyLogin(getParams());

    // Kein Error-Banner
    expect(setError).toHaveBeenCalledWith(null); // nur der initiale Reset
    expect(setError).not.toHaveBeenCalledWith(expect.stringContaining('fehlgeschlagen'));
    expect(setLoading).toHaveBeenLastCalledWith(false);
    expect(routerPush).not.toHaveBeenCalled();
  });

  // --- WebAuthn-Modul nicht geladen ---

  it('zeigt Fehler wenn WebAuthn-Modul null ist', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) });

    await handlePasskeyLogin(getParams({ webauthnModule: null }));

    expect(setError).toHaveBeenCalledWith('Biometrische Anmeldung wird nicht unterstützt.');
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  // --- Redirect-Pfad ---

  it('nutzt /dashboard als Fallback wenn kein redirect', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challengeId: 'ch-1', challenge: 'abc' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session: { access_token: 'at', refresh_token: 'rt' },
        }),
      });

    await handlePasskeyLogin(getParams());

    expect(routerPush).toHaveBeenCalledWith('/dashboard');
  });
});
