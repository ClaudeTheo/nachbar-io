// app/api/care/consultations/consent/route.ts
// API-Route fuer DSGVO-Einwilligung zur Online-Sprechstunde
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';

export async function GET(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

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
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

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
