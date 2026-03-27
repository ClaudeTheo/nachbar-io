// app/api/youth/consent/revoke/route.ts
// Jugend-Modul: Elternfreigabe widerrufen
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptField } from '@/lib/care/field-encryption';
import { getAccessLevel } from '@/lib/youth/profile';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let body: { youth_user_id: string; revoked_via: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { youth_user_id, revoked_via } = body;

  // Aktiven Consent finden
  const { data: consent } = await supabase
    .from('youth_guardian_consents')
    .select('id')
    .eq('youth_user_id', youth_user_id)
    .eq('status', 'granted')
    .single();

  if (!consent) {
    return NextResponse.json({ error: 'Keine aktive Freigabe gefunden' }, { status: 404 });
  }

  const ip = request.headers.get('x-forwarded-for') || '';
  const userAgent = request.headers.get('user-agent') || '';

  // Consent widerrufen
  await supabase
    .from('youth_guardian_consents')
    .update({
      status: 'revoked',
      revoked_via: revoked_via || 'sms_link',
      revoked_at: new Date().toISOString(),
      revoked_ip: encryptField(ip),
      revoked_user_agent: encryptField(userAgent),
    })
    .eq('id', consent.id);

  // Youth-Profil zurückstufen
  const { data: profile } = await supabase
    .from('youth_profiles')
    .select('age_group')
    .eq('user_id', youth_user_id)
    .single();

  const newLevel = profile ? getAccessLevel(profile.age_group as 'u16' | '16_17', false) : 'basis';

  await supabase
    .from('youth_profiles')
    .update({ access_level: newLevel })
    .eq('user_id', youth_user_id);

  return NextResponse.json({ success: true, new_level: newLevel }, { status: 200 });
}
