// app/api/care/profile/route.ts
// Nachbar.io — Pflege-Profil lesen (GET) und aktualisieren (PUT)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { requireCareAccess } from '@/lib/care/api-helpers';
import { encryptFields, decryptFields, CARE_PROFILES_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';
import { checkCareConsent } from '@/lib/care/consent';
import type { CareLevel, EscalationConfig, EmergencyContact } from '@/lib/care/types';

// Gueltige Pflegestufen
const VALID_CARE_LEVELS: CareLevel[] = ['none', '1', '2', '3', '4', '5'];

// Gueltige Kontakt-Rollen
const VALID_CONTACT_ROLES = ['relative', 'care_service', 'neighbor', 'other'] as const;

// Uhrzeit-Format pruefen (HH:MM)
function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

// Notfallkontakt validieren
function isValidContact(contact: unknown): contact is EmergencyContact {
  if (!contact || typeof contact !== 'object') return false;
  const c = contact as Record<string, unknown>;
  return (
    typeof c.name === 'string' && c.name.length > 0 &&
    typeof c.phone_encrypted === 'string' &&
    typeof c.role === 'string' && VALID_CONTACT_ROLES.includes(c.role as typeof VALID_CONTACT_ROLES[number]) &&
    typeof c.priority === 'number' &&
    typeof c.relationship === 'string'
  );
}

// Eskalationskonfiguration validieren
function isValidEscalationConfig(config: unknown): config is EscalationConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.escalate_to_level_2_after_minutes === 'number' && c.escalate_to_level_2_after_minutes > 0 &&
    typeof c.escalate_to_level_3_after_minutes === 'number' && c.escalate_to_level_3_after_minutes > 0 &&
    typeof c.escalate_to_level_4_after_minutes === 'number' && c.escalate_to_level_4_after_minutes > 0
  );
}

// GET /api/care/profile — Pflege-Profil lesen
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Optional: Senior-ID per Query-Param (fuer Helfer-Zugriff)
  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;

  // Zugriffspruefung bei Fremd-Zugriff
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) {
      return NextResponse.json({ error: 'Kein Zugriff auf dieses Profil' }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from('care_profiles')
    .select('*')
    .eq('user_id', seniorId)
    .maybeSingle();

  if (error) {
    console.error('[care/profile] Profil-Abfrage fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Profil konnte nicht geladen werden' }, { status: 500 });
  }

  // Gesundheitsfelder entschluesseln (Art. 9 DSGVO)
  const decryptedData = data ? decryptFields(data, CARE_PROFILES_ENCRYPTED_FIELDS) : data;

  return NextResponse.json(decryptedData);
}

// PUT /api/care/profile — Pflege-Profil erstellen oder aktualisieren
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Art. 9 DSGVO: Einwilligung prüfen
  const hasConsent = await checkCareConsent(supabase, user.id, 'care_profile');
  if (!hasConsent) {
    return NextResponse.json({ error: 'Einwilligung erforderlich', feature: 'care_profile' }, { status: 403 });
  }

  // Request-Body einlesen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const {
    care_level,
    emergency_contacts,
    medical_notes,
    preferred_hospital,
    checkin_times,
    checkin_enabled,
    escalation_config,
  } = body;

  // Validierung: Pflegestufe
  if (care_level !== undefined) {
    if (!VALID_CARE_LEVELS.includes(care_level as CareLevel)) {
      return NextResponse.json(
        { error: `Ungueltige Pflegestufe: "${care_level}". Erlaubt: ${VALID_CARE_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }
  }

  // Validierung: Check-in-Zeiten
  if (checkin_times !== undefined) {
    if (!Array.isArray(checkin_times)) {
      return NextResponse.json({ error: 'checkin_times muss ein Array sein' }, { status: 400 });
    }
    for (const time of checkin_times) {
      if (typeof time !== 'string' || !isValidTime(time)) {
        return NextResponse.json({ error: `Ungueltige Uhrzeit: "${time}". Format: HH:MM` }, { status: 400 });
      }
    }
  }

  // Validierung: Notfallkontakte
  if (emergency_contacts !== undefined) {
    if (!Array.isArray(emergency_contacts)) {
      return NextResponse.json({ error: 'emergency_contacts muss ein Array sein' }, { status: 400 });
    }
    for (let i = 0; i < emergency_contacts.length; i++) {
      if (!isValidContact(emergency_contacts[i])) {
        return NextResponse.json(
          { error: `Ungueltiger Notfallkontakt an Position ${i + 1}. Erforderlich: name, phone_encrypted, role, priority, relationship` },
          { status: 400 }
        );
      }
    }
  }

  // Validierung: Eskalationskonfiguration
  if (escalation_config !== undefined) {
    if (!isValidEscalationConfig(escalation_config)) {
      return NextResponse.json(
        { error: 'Ungueltige Eskalationskonfiguration. Erforderlich: escalate_to_level_2/3/4_after_minutes (positive Zahlen)' },
        { status: 400 }
      );
    }
  }

  // Update-Objekt aufbauen (nur gesetzte Felder)
  const updateData: Record<string, unknown> = { user_id: user.id };

  if (care_level !== undefined) updateData.care_level = care_level;
  if (emergency_contacts !== undefined) updateData.emergency_contacts = emergency_contacts;
  if (medical_notes !== undefined) updateData.medical_notes = medical_notes || null;
  if (preferred_hospital !== undefined) updateData.preferred_hospital = preferred_hospital || null;
  if (checkin_times !== undefined) updateData.checkin_times = checkin_times;
  if (checkin_enabled !== undefined) updateData.checkin_enabled = !!checkin_enabled;
  if (escalation_config !== undefined) updateData.escalation_config = escalation_config;

  // Gesundheitsfelder verschluesseln (Art. 9 DSGVO)
  const encryptedData = encryptFields(updateData, CARE_PROFILES_ENCRYPTED_FIELDS);

  // Upsert: Erstellen falls nicht vorhanden, sonst aktualisieren
  const { data: profile, error } = await supabase
    .from('care_profiles')
    .upsert(encryptedData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('[care/profile] Profil-Upsert fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Profil konnte nicht gespeichert werden' }, { status: 500 });
  }

  // Audit-Log: Profil-Aenderung protokollieren
  try {
    await writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'profile_updated',
      referenceType: 'care_profiles',
      referenceId: profile.id,
      metadata: {
        updatedFields: Object.keys(updateData).filter((k) => k !== 'user_id'),
      },
    });
  } catch (auditError) {
    console.error('[care/profile] Audit-Log fehlgeschlagen:', auditError);
  }

  // Entschluesselt zurueckgeben
  return NextResponse.json(decryptFields(profile, CARE_PROFILES_ENCRYPTED_FIELDS));
}
