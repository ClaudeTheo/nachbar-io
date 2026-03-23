import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransport } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getPasskeyConfig, CHALLENGE_COOKIE } from '@/lib/auth/passkey';
import { decryptField } from '@/lib/care/field-encryption';
import { createClient as createBrowserClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const challenge = req.cookies.get(CHALLENGE_COOKIE)?.value;
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge abgelaufen' }, { status: 400 });
    }

    const body = await req.json();
    const { response: authResponse } = body;

    if (!authResponse?.id) {
      return NextResponse.json({ error: 'Assertion fehlt' }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const { data: credential, error: credError } = await admin
      .from('passkey_credentials')
      .select('user_id, credential_id, public_key, counter, transports')
      .eq('credential_id', authResponse.id)
      .maybeSingle();

    if (credError || !credential) {
      return NextResponse.json({ error: 'Passkey nicht gefunden' }, { status: 401 });
    }

    const config = getPasskeyConfig();

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      credential: {
        id: credential.credential_id,
        publicKey: isoBase64URL.toBuffer(credential.public_key),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransport[],
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verifizierung fehlgeschlagen' }, { status: 401 });
    }

    await admin
      .from('passkey_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('credential_id', credential.credential_id);

    const { data: authUser } = await admin.auth.admin.getUserById(credential.user_id);
    if (!authUser?.user?.email) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 401 });
    }

    const { data: profile } = await admin
      .from('users')
      .select('passkey_secret, ui_mode')
      .eq('id', credential.user_id)
      .single();

    if (!profile?.passkey_secret) {
      return NextResponse.json({ error: 'Passkey-Konfiguration unvollstaendig' }, { status: 500 });
    }

    const secret = decryptField(profile.passkey_secret);
    if (!secret) {
      return NextResponse.json({ error: 'Entschluesselung fehlgeschlagen' }, { status: 500 });
    }

    // Supabase-Session erzeugen via Anon-Key Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.user.email,
      password: secret,
    });

    if (signInError || !session) {
      console.error('[Passkey] signInWithPassword fehlgeschlagen:', signInError);
      return NextResponse.json({ error: 'Session-Erzeugung fehlgeschlagen' }, { status: 500 });
    }

    const redirect = profile.ui_mode === 'senior' ? '/senior/home' : '/dashboard';

    const response = NextResponse.json({
      success: true,
      redirect,
      session: {
        access_token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
      },
    });
    response.cookies.delete(CHALLENGE_COOKIE);

    return response;
  } catch (err) {
    console.error('[Passkey] login-complete Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
