// app/api/care/consultations/consent/route.ts
// API-Route fuer DSGVO-Einwilligung zur Online-Sprechstunde
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const providerType = request.nextUrl.searchParams.get('provider_type') || 'community';

  const { data } = await supabase
    .from('consultation_consents')
    .select('id, consent_version, consented_at')
    .eq('user_id', user.id)
    .eq('provider_type', providerType)
    .eq('consent_version', 'v1')
    .maybeSingle();

  return NextResponse.json({ consented: !!data, consent: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: { provider_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges JSON' }, { status: 400 });
  }

  const providerType = body.provider_type || 'community';
  if (!['community', 'medical'].includes(providerType)) {
    return NextResponse.json({ error: 'Ungueltiger provider_type' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('consultation_consents')
    .upsert({
      user_id: user.id,
      consent_version: 'v1',
      provider_type: providerType,
      consented_at: new Date().toISOString(),
    }, { onConflict: 'user_id,consent_version,provider_type' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
