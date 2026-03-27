import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getPasskeyConfig } from '@/lib/auth/passkey';
import { getAdminSupabase } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const config = getPasskeyConfig();

    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      userVerification: 'preferred',
    });

    // Challenge in DB speichern statt Cookie (iOS-Kompatibilität)
    const admin = getAdminSupabase();
    const { data: row, error } = await admin
      .from('passkey_challenges')
      .insert({
        challenge: options.challenge,
        expires_at: new Date(Date.now() + 120_000).toISOString(),
      })
      .select('id')
      .single();

    if (error || !row) {
      console.error('[Passkey] Challenge speichern fehlgeschlagen:', error);
      return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
    }

    // Challenge-ID im Response mitgeben (Client sendet sie bei login-complete zurück)
    return NextResponse.json({ ...options, challengeId: row.id });
  } catch (err) {
    console.error('[Passkey] login-begin Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
