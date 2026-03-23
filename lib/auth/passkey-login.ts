// lib/auth/passkey-login.ts
// Extrahierte Passkey-Login-Logik (testbar, mit Error Surfacing + Session-Verifikation)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type WebAuthnModule = typeof import('@simplewebauthn/browser');

interface PasskeyLoginParams {
  webauthnModule: WebAuthnModule | null;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  createClient: () => SupabaseClient;
  router: AppRouterInstance;
}

export async function handlePasskeyLogin({
  webauthnModule,
  setError,
  setLoading,
  createClient,
  router,
}: PasskeyLoginParams) {
  setLoading(true);
  setError(null);

  try {
    // 1. Login-Challenge anfordern
    const beginRes = await fetch('/api/auth/passkey/login-begin', { method: 'POST' });
    if (!beginRes.ok) {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      setLoading(false);
      return;
    }
    const options = await beginRes.json();
    const { challengeId, ...webauthnOptions } = options;

    // 2. WebAuthn Assertion
    if (!webauthnModule) {
      setError('Biometrische Anmeldung wird nicht unterstützt.');
      setLoading(false);
      return;
    }
    const assertion = await webauthnModule.startAuthentication({ optionsJSON: webauthnOptions });

    // 3. Assertion verifizieren + Session erzeugen
    const completeRes = await fetch('/api/auth/passkey/login-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: assertion, challengeId }),
    });

    if (!completeRes.ok) {
      const errorBody = await completeRes.json().catch(() => ({}));
      setError(errorBody.error || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      setLoading(false);
      return;
    }

    const { redirect, session } = await completeRes.json();

    // 4. Session-Tokens setzen + verifizieren
    if (session?.access_token) {
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessionError) {
        console.error('[Passkey] setSession fehlgeschlagen:', sessionError);
        setError('Sitzung konnte nicht erstellt werden. Bitte mit E-Mail anmelden.');
        setLoading(false);
        return;
      }

      // Verifizierung: Session wirklich aktiv?
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('[Passkey] Session-Verifikation fehlgeschlagen:', userError);
        setError('Sitzung konnte nicht verifiziert werden. Bitte mit E-Mail anmelden.');
        setLoading(false);
        return;
      }
    }

    // 5. Redirect (erst nach verifizierter Session)
    router.push(redirect || '/dashboard');
  } catch (err) {
    console.error('[Passkey] Login fehlgeschlagen:', err);
    // WebAuthn-Abbruch durch User (NotAllowedError) — kein Error-Banner
    if (err instanceof Error && err.name === 'NotAllowedError') {
      setLoading(false);
      return;
    }
    setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    setLoading(false);
  }
}
