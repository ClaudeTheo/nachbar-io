import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransport } from '@simplewebauthn/server';
import { createClient } from '@/lib/supabase/server';
import { getPasskeyConfig, CHALLENGE_COOKIE, CHALLENGE_MAX_AGE } from '@/lib/auth/passkey';

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

    const response = NextResponse.json(options);
    response.cookies.set(CHALLENGE_COOKIE, options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CHALLENGE_MAX_AGE,
      path: '/api/auth/passkey',
    });

    return response;
  } catch (err) {
    console.error('[Passkey] register-begin Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
