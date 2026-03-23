import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { createClient } from '@/lib/supabase/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getPasskeyConfig, generatePasskeySecret, CHALLENGE_COOKIE } from '@/lib/auth/passkey';
import { encryptField } from '@/lib/care/field-encryption';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const challenge = req.cookies.get(CHALLENGE_COOKIE)?.value;
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge abgelaufen' }, { status: 400 });
    }

    const body = await req.json();
    const { response: attResponse, deviceName } = body;

    if (!attResponse) {
      return NextResponse.json({ error: 'Attestation fehlt' }, { status: 400 });
    }

    const config = getPasskeyConfig();

    const verification = await verifyRegistrationResponse({
      response: attResponse,
      expectedChallenge: challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verifizierung fehlgeschlagen' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    const { error: insertError } = await supabase
      .from('passkey_credentials')
      .insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        device_name: deviceName || 'Unbekanntes Geraet',
        transports: attResponse.response?.transports || [],
      });

    if (insertError) {
      console.error('[Passkey] Credential speichern fehlgeschlagen:', insertError);
      return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 });
    }

    // passkey_secret generieren (falls noch nicht vorhanden)
    const { data: profile } = await supabase
      .from('users')
      .select('passkey_secret')
      .eq('id', user.id)
      .single();

    if (!profile?.passkey_secret) {
      const secret = generatePasskeySecret();
      const encrypted = encryptField(secret);

      await supabase
        .from('users')
        .update({ passkey_secret: encrypted })
        .eq('id', user.id);

      const admin = getAdminSupabase();
      await admin.auth.admin.updateUserById(user.id, {
        password: secret,
      });
    }

    const response = NextResponse.json({
      success: true,
      device_name: deviceName || 'Unbekanntes Geraet',
    });
    response.cookies.delete(CHALLENGE_COOKIE);

    return response;
  } catch (err) {
    console.error('[Passkey] register-complete Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
