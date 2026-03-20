// app/api/care/consent/revoke/route.ts
// Art. 9 Einwilligungswiderruf mit optionaler Datenloeschung

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { CONSENT_FEATURES } from '@/lib/care/types';
import { CURRENT_CONSENT_VERSION } from '@/lib/care/constants';
import type { CareConsentFeature } from '@/lib/care/types';

// Mapping: Welche Tabellen werden bei Datenloeschung betroffen?
const FEATURE_DATA_TABLES: Record<CareConsentFeature, { table: string; column: string }[]> = {
  sos: [{ table: 'care_sos_alerts', column: 'reporter_id' }],
  checkin: [{ table: 'care_checkins', column: 'senior_id' }],
  medications: [
    { table: 'care_medication_logs', column: 'senior_id' },
    { table: 'care_medications', column: 'senior_id' },
  ],
  care_profile: [{ table: 'care_profiles', column: 'user_id' }],
  emergency_contacts: [],
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: { feature: string; delete_data?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { feature, delete_data = false } = body;

  // Validierung
  if (!feature || !(CONSENT_FEATURES as readonly string[]).includes(feature)) {
    return NextResponse.json(
      { error: `Ungültiges Feature: "${feature}". Erlaubt: ${CONSENT_FEATURES.join(', ')}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const revokedFeatures: string[] = [feature];

  // Consent widerrufen
  const { data: consent, error } = await supabase
    .from('care_consents')
    .update({ granted: false, revoked_at: now, updated_at: now })
    .eq('user_id', user.id)
    .eq('feature', feature)
    .select()
    .single();

  if (error) {
    console.error(`[care/consent/revoke] Widerruf fehlgeschlagen fuer ${feature}:`, error);
    return NextResponse.json({ error: 'Widerruf fehlgeschlagen' }, { status: 500 });
  }

  // History-Eintrag
  await supabase.from('care_consent_history').insert({
    consent_id: consent.id,
    user_id: user.id,
    feature,
    action: 'revoked',
    consent_version: CURRENT_CONSENT_VERSION,
  });

  // Abhaengigkeit: sos-Widerruf → emergency_contacts auch widerrufen
  if (feature === 'sos') {
    const { data: ecConsent } = await supabase
      .from('care_consents')
      .select('id, granted')
      .eq('user_id', user.id)
      .eq('feature', 'emergency_contacts')
      .maybeSingle();

    if (ecConsent?.granted) {
      await supabase
        .from('care_consents')
        .update({ granted: false, revoked_at: now, updated_at: now })
        .eq('id', ecConsent.id);

      await supabase.from('care_consent_history').insert({
        consent_id: ecConsent.id,
        user_id: user.id,
        feature: 'emergency_contacts',
        action: 'revoked',
        consent_version: CURRENT_CONSENT_VERSION,
      });

      revokedFeatures.push('emergency_contacts');
    }
  }

  // Optionale Datenloeschung
  if (delete_data) {
    const tables = FEATURE_DATA_TABLES[feature as CareConsentFeature] ?? [];
    for (const { table, column } of tables) {
      await supabase.from(table).delete().eq(column, user.id);
    }

    if (feature === 'emergency_contacts') {
      await supabase
        .from('care_profiles')
        .update({ emergency_contacts: null })
        .eq('user_id', user.id);
    }
  }

  // Audit-Log
  try {
    await writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'consent_revoked',
      metadata: { features: revokedFeatures, delete_data },
    });
  } catch (err) {
    console.error('[care/consent/revoke] Audit-Log fehlgeschlagen:', err);
  }

  return NextResponse.json({ revoked: revokedFeatures, data_deleted: delete_data });
}
