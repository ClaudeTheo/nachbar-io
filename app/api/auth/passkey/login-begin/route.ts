import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getPasskeyConfig, CHALLENGE_COOKIE, CHALLENGE_MAX_AGE } from '@/lib/auth/passkey';

export async function POST() {
  try {
    const config = getPasskeyConfig();

    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      userVerification: 'preferred',
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
    console.error('[Passkey] login-begin Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
