import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransport } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getPasskeyConfig, generatePasskeySecret } from '@/lib/auth/passkey';
import { decryptField, encryptField } from '@/lib/care/field-encryption';
import { createClient as createBrowserClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { response: authResponse, challengeId } = body;

    if (!authResponse?.id) {
      return NextResponse.json({ error: 'Assertion fehlt' }, { status: 400 });
    }

    if (!challengeId) {
      return NextResponse.json({ error: 'Challenge-ID fehlt' }, { status: 400 });
    }

    // Challenge aus DB lesen statt Cookie (iOS-Kompatibilitaet)
    const admin = getAdminSupabase();
    const { data: challengeRow, error: challengeError } = await admin
      .from('passkey_challenges')
      .select('challenge, expires_at')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challengeRow) {
      return NextResponse.json({ error: 'Challenge nicht gefunden. Bitte erneut versuchen.' }, { status: 400 });
    }

    console.info('[Passkey] login-complete: Challenge geladen OK');

    // Challenge abgelaufen?
    if (new Date(challengeRow.expires_at) < new Date()) {
      await admin.from('passkey_challenges').delete().eq('id', challengeId);
      return NextResponse.json({ error: 'Challenge abgelaufen. Bitte erneut versuchen.' }, { status: 400 });
    }

    // Challenge aufraeumen (einmalig verwendbar)
    await admin.from('passkey_challenges').delete().eq('id', challengeId);

    const { data: credential, error: credError } = await admin
      .from('passkey_credentials')
      .select('user_id, credential_id, public_key, counter, transports')
      .eq('credential_id', authResponse.id)
      .maybeSingle();

    if (credError || !credential) {
      return NextResponse.json({ error: 'Passkey nicht gefunden' }, { status: 401 });
    }

    console.info('[Passkey] login-complete: Credential gefunden OK, user:', credential.user_id);

    const config = getPasskeyConfig();

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: challengeRow.challenge,
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

    console.info('[Passkey] login-complete: Verifikation OK');

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

    console.info('[Passkey] login-complete: Decrypt OK');

    // Supabase-Session erzeugen via Anon-Key Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    let signInResult = await supabase.auth.signInWithPassword({
      email: authUser.user.email,
      password: secret,
    });

    // Secret-Recovery: Wenn Passwort nicht passt (z.B. manuell geaendert),
    // neues Secret generieren und als Passwort setzen
    if (signInResult.error) {
      console.warn('[Passkey] signInWithPassword fehlgeschlagen, versuche Secret-Recovery:', signInResult.error.message);

      const newSecret = generatePasskeySecret();
      const { error: updatePwError } = await admin.auth.admin.updateUserById(
        credential.user_id,
        { password: newSecret }
      );

      if (updatePwError) {
        console.error('[Passkey] Secret-Recovery: Passwort-Update fehlgeschlagen:', updatePwError);
        return NextResponse.json({ error: 'Session-Erzeugung fehlgeschlagen' }, { status: 500 });
      }

      // Neues Secret verschluesselt speichern
      await admin
        .from('users')
        .update({ passkey_secret: encryptField(newSecret) })
        .eq('id', credential.user_id);

      // Retry mit neuem Secret
      signInResult = await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password: newSecret,
      });

      if (signInResult.error) {
        console.error('[Passkey] Secret-Recovery: Retry fehlgeschlagen:', signInResult.error);
        return NextResponse.json({ error: 'Session-Erzeugung fehlgeschlagen' }, { status: 500 });
      }

      console.info('[Passkey] Secret-Recovery erfolgreich fuer User:', credential.user_id);
    }

    console.info('[Passkey] login-complete: Session erzeugt OK');

    const session = signInResult.data;
    const redirect = profile.ui_mode === 'senior' ? '/senior/home' : '/dashboard';

    return NextResponse.json({
      success: true,
      redirect,
      session: {
        access_token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
      },
    });
  } catch (err) {
    console.error('[Passkey] login-complete Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
