// app/api/youth/consent/verify/route.ts
// Jugend-Modul: Elternfreigabe verifizieren (Guardian klickt SMS-Link)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashToken, isTokenExpired } from '@/lib/youth/consent';
import { encryptField } from '@/lib/care/field-encryption';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let body: { token: string; guardian_name: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { token, guardian_name } = body;
  if (!token || !guardian_name) {
    return NextResponse.json({ error: 'Token und Name erforderlich' }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  // Consent-Eintrag finden
  const { data: consent } = await supabase
    .from('youth_guardian_consents')
    .select('id, youth_user_id, token_expires_at, status')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .single();

  if (!consent) {
    return NextResponse.json({ error: 'Ungültiger oder bereits verwendeter Freigabe-Link' }, { status: 404 });
  }

  if (isTokenExpired(consent.token_expires_at)) {
    await supabase
      .from('youth_guardian_consents')
      .update({ status: 'expired' })
      .eq('id', consent.id);
    return NextResponse.json({ error: 'Der Freigabe-Link ist abgelaufen. Bitte fordern Sie einen neuen an.' }, { status: 410 });
  }

  // Nachweis-Daten erfassen
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  const userAgent = request.headers.get('user-agent') || '';

  // Consent erteilen
  await supabase
    .from('youth_guardian_consents')
    .update({
      status: 'granted',
      guardian_name: encryptField(guardian_name),
      granted_via: 'sms_link',
      granted_at: new Date().toISOString(),
      granted_ip: encryptField(ip),
      granted_user_agent: encryptField(userAgent),
    })
    .eq('id', consent.id);

  // Youth-Profil auf 'freigeschaltet' upgraden
  await supabase
    .from('youth_profiles')
    .update({ access_level: 'freigeschaltet' })
    .eq('user_id', consent.youth_user_id);

  return NextResponse.json({ success: true, message: 'Freigabe erteilt' }, { status: 200 });
}
