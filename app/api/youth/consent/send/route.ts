// app/api/youth/consent/send/route.ts
// Jugend-Modul: Elternfreigabe-Token per SMS senden
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateConsentToken, hashToken, CONSENT_TEXT_VERSION, TOKEN_EXPIRY_HOURS, MAX_TOKEN_SENDS } from '@/lib/youth/consent';
import { sendSms } from '@/lib/care/channels/sms';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  let body: { guardian_phone: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { guardian_phone } = body;
  if (!guardian_phone || !guardian_phone.startsWith('+')) {
    return NextResponse.json({ error: 'Gültige Telefonnummer mit Landesvorwahl erforderlich' }, { status: 400 });
  }

  // Pruefe ob Youth-Profil existiert
  const { data: profile } = await supabase
    .from('youth_profiles')
    .select('id, access_level')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Kein Jugend-Profil gefunden' }, { status: 404 });
  }

  // Rate-Limit: max 3 Token-Sendungen pruefen
  const guardianPhoneHash = createHash('sha256').update(guardian_phone).digest('hex');
  const { data: existingConsent } = await supabase
    .from('youth_guardian_consents')
    .select('id, token_send_count, status')
    .eq('youth_user_id', user.id)
    .eq('status', 'pending')
    .single();

  if (existingConsent && existingConsent.token_send_count >= MAX_TOKEN_SENDS) {
    return NextResponse.json({ error: 'Maximale Anzahl Sendungen erreicht. Bitte warten Sie 72 Stunden.' }, { status: 429 });
  }

  // Token generieren
  const token = generateConsentToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  if (existingConsent) {
    // Bestehenden Eintrag aktualisieren (neuer Token, Zaehler erhoehen)
    await supabase
      .from('youth_guardian_consents')
      .update({
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        token_last_sent_at: new Date().toISOString(),
        token_send_count: existingConsent.token_send_count + 1,
        guardian_phone_hash: guardianPhoneHash,
      })
      .eq('id', existingConsent.id);
  } else {
    // Neuen Eintrag erstellen
    await supabase
      .from('youth_guardian_consents')
      .insert({
        youth_user_id: user.id,
        guardian_phone_hash: guardianPhoneHash,
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        token_last_sent_at: new Date().toISOString(),
        token_send_count: 1,
        consent_text_version: CONSENT_TEXT_VERSION,
        status: 'pending',
      });
  }

  // SMS senden
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quartierapp.de';
  const consentUrl = `${appUrl}/jugend/freigabe/${token}`;

  const userName = user.user_metadata?.first_name || 'Ihr Kind';

  await sendSms({
    phone: guardian_phone,
    message: `${userName} möchte erweiterte Funktionen in QuartierApp nutzen. Bitte bestätigen Sie hier: ${consentUrl} (gültig 72h)`,
  });

  return NextResponse.json({ sent: true }, { status: 200 });
}
