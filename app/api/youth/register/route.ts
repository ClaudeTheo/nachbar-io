// app/api/youth/register/route.ts
// Jugend-Modul: Registrierungs-Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateAgeGroup, getAccessLevel } from '@/lib/youth/profile';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  let body: { birth_year?: number; quarter_id?: string; first_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { birth_year, quarter_id } = body;

  if (!birth_year || typeof birth_year !== 'number') {
    return NextResponse.json({ error: 'Geburtsjahr erforderlich' }, { status: 400 });
  }

  const ageGroup = calculateAgeGroup(birth_year);
  if (!ageGroup) {
    return NextResponse.json(
      { error: 'Das Jugend-Modul ist für 14- bis 17-Jährige verfügbar.' },
      { status: 400 }
    );
  }

  const accessLevel = getAccessLevel(ageGroup, false);
  const phoneHash = user.phone
    ? createHash('sha256').update(user.phone).digest('hex')
    : '';

  // Duplikat-Prüfung
  const { data: existing } = await supabase
    .from('youth_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Jugend-Profil existiert bereits' }, { status: 409 });
  }

  const { data: profile, error } = await supabase
    .from('youth_profiles')
    .insert({
      user_id: user.id,
      birth_year,
      age_group: ageGroup,
      access_level: accessLevel,
      phone_hash: phoneHash,
      quarter_id: quarter_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 500 });
  }

  // "Quartiers-Neuling" Badge automatisch vergeben
  const { data: badge } = await supabase
    .from('youth_badges')
    .select('id')
    .eq('slug', 'quartiers-neuling')
    .single();

  if (badge) {
    await supabase.from('youth_earned_badges').insert({
      user_id: user.id,
      badge_id: badge.id,
    });

    await supabase.from('youth_points_ledger').insert({
      user_id: user.id,
      points: 10,
      source_type: 'badge',
      source_id: badge.id,
      description: 'Willkommens-Bonus: Quartiers-Neuling',
    });
  }

  return NextResponse.json({
    profile,
    access_level: accessLevel,
    age_group: ageGroup,
  }, { status: 201 });
}
