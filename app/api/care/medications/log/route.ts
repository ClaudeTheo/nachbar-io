// app/api/care/medications/log/route.ts
// Nachbar.io — Medikamenten-Einnahme protokollieren (POST) und Log abrufen (GET)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { requireCareAccess } from '@/lib/care/api-helpers';
import { MEDICATION_DEFAULTS } from '@/lib/care/constants';
import { decryptField } from '@/lib/care/field-encryption';
import type { CareMedicationLogStatus } from '@/lib/care/types';

const VALID_LOG_STATUSES: CareMedicationLogStatus[] = ['taken', 'skipped', 'snoozed'];

// POST /api/care/medications/log — Einnahme protokollieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  let body: { medication_id?: string; status?: CareMedicationLogStatus; scheduled_at?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { medication_id, status, scheduled_at } = body;
  if (!medication_id || !status || !scheduled_at) {
    return NextResponse.json({ error: 'medication_id, status und scheduled_at sind erforderlich' }, { status: 400 });
  }

  if (!VALID_LOG_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Ungueltiger Status: ${status}` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const snoozedUntil = status === 'snoozed'
    ? new Date(Date.now() + MEDICATION_DEFAULTS.snoozeMinutes * 60 * 1000).toISOString()
    : null;

  // Upsert: Aktualisiere vorhandenen Log oder erstelle neuen
  const { data: existing } = await supabase
    .from('care_medication_logs')
    .select('id')
    .eq('medication_id', medication_id)
    .eq('scheduled_at', scheduled_at)
    .maybeSingle();

  let logEntry;
  if (existing) {
    const { data, error } = await supabase
      .from('care_medication_logs')
      .update({ status, confirmed_at: status === 'taken' ? now : null, snoozed_until: snoozedUntil })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'Log konnte nicht aktualisiert werden' }, { status: 500 });
    logEntry = data;
  } else {
    const { data, error } = await supabase
      .from('care_medication_logs')
      .insert({
        medication_id,
        senior_id: user.id,
        scheduled_at,
        status,
        confirmed_at: status === 'taken' ? now : null,
        snoozed_until: snoozedUntil,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'Log konnte nicht erstellt werden' }, { status: 500 });
    logEntry = data;
  }

  // Audit-Log
  const auditEvent = status === 'taken' ? 'medication_taken'
    : status === 'skipped' ? 'medication_skipped'
    : 'medication_snoozed';
  await writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: auditEvent,
    referenceType: 'care_medication_logs',
    referenceId: logEntry.id,
    metadata: { medication_id, status },
  }).catch(() => {});

  // Bei "skipped": Angehoerige benachrichtigen
  if (status === 'skipped') {
    const { data: relatives } = await supabase
      .from('care_helpers')
      .select('user_id')
      .eq('role', 'relative')
      .eq('verification_status', 'verified')
      .contains('assigned_seniors', [user.id]);

    if (relatives && relatives.length > 0) {
      const { data: med } = await supabase
        .from('care_medications')
        .select('name')
        .eq('id', medication_id)
        .single();

      // Medikamenten-Name entschluesseln fuer Benachrichtigungstext
      const medName = med?.name ? decryptField(med.name) : null;

      for (const rel of relatives) {
        await sendCareNotification(supabase, {
          userId: rel.user_id,
          type: 'care_medication_missed',
          title: 'Medikament uebersprungen',
          body: `${medName ?? 'Ein Medikament'} wurde uebersprungen.`,
          referenceId: logEntry.id,
          referenceType: 'care_medication_logs',
          url: '/care/medications',
          channels: ['push', 'in_app'],
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json(logEntry, { status: 201 });
}

// GET /api/care/medications/log — Log-Historie abrufen
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;
  const medicationId = searchParams.get('medication_id');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 100);

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  let query = supabase
    .from('care_medication_logs')
    .select('*, medication:care_medications(name, dosage)')
    .eq('senior_id', seniorId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (medicationId) query = query.eq('medication_id', medicationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Log konnte nicht geladen werden' }, { status: 500 });

  // Verschluesselte Medikamenten-Namen in der verschachtelten Relation entschluesseln
  const decryptedData = (data ?? []).map((log: Record<string, unknown>) => {
    if (log.medication && typeof log.medication === 'object') {
      const med = log.medication as Record<string, unknown>;
      return {
        ...log,
        medication: {
          ...med,
          name: typeof med.name === 'string' ? decryptField(med.name) : med.name,
          dosage: typeof med.dosage === 'string' ? decryptField(med.dosage) : med.dosage,
        },
      };
    }
    return log;
  });

  return NextResponse.json(decryptedData);
}
