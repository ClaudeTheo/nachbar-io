import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransport } from '@simplewebauthn/server';
import { createClient } from '@/lib/supabase/server';
import { getPasskeyConfig } from '@/lib/auth/passkey';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from('passkey_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    const config = getPasskeyConfig();

    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userName: user.email || user.id,
      userDisplayName: user.email || 'Nutzer',
      attestationType: 'none',
      excludeCredentials: (existing || []).map(c => ({
        id: c.credential_id,
        transports: c.transports as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Challenge in DB speichern statt Cookie (iOS-Kompatibilität)
    // Cookies gehen auf iPhone Chrome nach Face-ID-Dialog verloren
    const expiresAt = new Date(Date.now() + 120_000).toISOString(); // 2 Minuten
    await supabase
      .from('users')
      .update({
        passkey_challenge: options.challenge,
        passkey_challenge_expires_at: expiresAt,
      })
      .eq('id', user.id);

    return NextResponse.json(options);
  } catch (err) {
    console.error('[Passkey] register-begin Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
