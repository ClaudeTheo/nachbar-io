// app/api/care/consent/route.ts
// Art. 9 Einwilligungsmanagement — Consents lesen und erteilen

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { getConsentsForUser } from '@/lib/care/consent';
import { CONSENT_FEATURES } from '@/lib/care/types';
import { CURRENT_CONSENT_VERSION } from '@/lib/care/constants';
import type { CareConsentFeature } from '@/lib/care/types';

// GET /api/care/consent — Alle Consents laden
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const consents = await getConsentsForUser(supabase, user.id);
  const hasAny = Object.values(consents).some((c) => c.granted);

  return NextResponse.json({ consents, has_any_consent: hasAny });
}

// POST /api/care/consent — Consents erteilen/aktualisieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: { features: Record<string, boolean> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  if (!body.features || typeof body.features !== 'object') {
    return NextResponse.json({ error: 'features-Objekt erforderlich' }, { status: 400 });
  }

  // Validierung: Nur gueltige Feature-Keys
  const validFeatures = new Set<string>(CONSENT_FEATURES);
  for (const key of Object.keys(body.features)) {
    if (!validFeatures.has(key)) {
      return NextResponse.json(
        { error: `Ungültiges Feature: "${key}". Erlaubt: ${CONSENT_FEATURES.join(', ')}` },
        { status: 400 },
      );
    }
  }

  // Abhaengigkeitsregel: emergency_contacts erfordert sos
  if (body.features.emergency_contacts && !body.features.sos) {
    return NextResponse.json(
      { error: 'Notfallkontakte erfordern die SOS-Einwilligung' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const changedFeatures: string[] = [];

  // Aktuelle Consents laden (fuer History-Vergleich)
  const currentConsents = await getConsentsForUser(supabase, user.id);

  // Upsert fuer jedes Feature
  for (const feature of CONSENT_FEATURES) {
    if (!(feature in body.features)) continue;

    const newGranted = body.features[feature] === true;
    const currentGranted = currentConsents[feature]?.granted ?? false;

    // Nur aendern wenn sich der Status geaendert hat
    if (newGranted === currentGranted) continue;

    const consentData: Record<string, unknown> = {
      user_id: user.id,
      feature,
      granted: newGranted,
      consent_version: CURRENT_CONSENT_VERSION,
      updated_at: now,
    };

    if (newGranted) {
      consentData.granted_at = now;
      consentData.revoked_at = null;
    } else {
      consentData.revoked_at = now;
    }

    const { data: upserted, error } = await supabase
      .from('care_consents')
      .upsert(consentData, { onConflict: 'user_id,feature' })
      .select()
      .single();

    if (error) {
      console.error(`[care/consent] Upsert fehlgeschlagen fuer ${feature}:`, error);
      continue;
    }

    // History-Eintrag
    await supabase.from('care_consent_history').insert({
      consent_id: upserted.id,
      user_id: user.id,
      feature,
      action: newGranted ? 'granted' : 'revoked',
      consent_version: CURRENT_CONSENT_VERSION,
    });

    changedFeatures.push(`${feature}:${newGranted ? 'granted' : 'revoked'}`);
  }

  // Audit-Log
  if (changedFeatures.length > 0) {
    try {
      await writeAuditLog(supabase, {
        seniorId: user.id,
        actorId: user.id,
        eventType: 'consent_updated',
        metadata: { changes: changedFeatures },
      });
    } catch (err) {
      console.error('[care/consent] Audit-Log fehlgeschlagen:', err);
    }
  }

  // Aktualisierte Consents zurueckgeben
  const updatedConsents = await getConsentsForUser(supabase, user.id);
  const hasAny = Object.values(updatedConsents).some((c) => c.granted);

  return NextResponse.json({ consents: updatedConsents, has_any_consent: hasAny });
}
