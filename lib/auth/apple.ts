// Apple Sign-In Helper fuer Supabase OAuth
// Apple App Store Guideline 4.8: Sign in with Apple Pflicht bei Social Login

import { createClient } from '@/lib/supabase/client';

/**
 * Sign in with Apple via Supabase OAuth
 * Voraussetzung: Apple Provider in Supabase Dashboard aktiviert
 */
export async function signInWithApple() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

/**
 * Apple Token widerrufen bei Account-Loeschung
 * Apple Guideline 5.1.1(v): Token Revocation bei Account Deletion
 */
export async function revokeAppleToken(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.provider_token) {
    try {
      const res = await fetch('/api/auth/apple-revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.provider_token }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  return true; // Kein Apple-Token vorhanden = nichts zu widerrufen
}
