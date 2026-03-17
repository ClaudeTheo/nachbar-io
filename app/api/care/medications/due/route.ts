// app/api/care/medications/due/route.ts
// Nachbar.io — Faellige Medikamente fuer heute berechnen

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, unauthorizedResponse, requireCareAccess } from '@/lib/care/api-helpers';
import { decryptFieldsArray, CARE_MEDICATIONS_ENCRYPTED_FIELDS } from '@/lib/care/field-encryption';
import type { CareMedication, MedicationSchedule } from '@/lib/care/types';

// Berechnet ob ein Medikament zu einer bestimmten Uhrzeit faellig ist
function isDueAt(schedule: MedicationSchedule, timeStr: string, dayName: string): boolean {
  if (schedule.type === 'daily' && schedule.times) {
    return schedule.times.includes(timeStr);
  }
  if (schedule.type === 'weekly' && schedule.days && schedule.time) {
    return schedule.days.includes(dayName) && schedule.time === timeStr;
  }
  return false;
}

// GET /api/care/medications/due — Heute faellige Medikamente
export async function GET(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;

  // Zugriffspruefung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== user.id) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) return NextResponse.json({ error: 'Kein Zugriff auf diesen Senior' }, { status: 403 });
  }

  // Aktive Medikamente laden
  const { data: medications, error: medsError } = await supabase
    .from('care_medications')
    .select('*')
    .eq('senior_id', seniorId)
    .eq('active', true);

  if (medsError) return NextResponse.json({ error: 'Medikamente konnten nicht geladen werden' }, { status: 500 });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = dayNames[now.getDay()];

  // Heutige Logs laden
  const { data: todayLogs } = await supabase
    .from('care_medication_logs')
    .select('medication_id, scheduled_at, status, snoozed_until')
    .eq('senior_id', seniorId)
    .gte('scheduled_at', `${today}T00:00:00`)
    .lt('scheduled_at', `${today}T23:59:59`);

  const logMap = new Map<string, { status: string; snoozed_until: string | null }>();
  for (const log of todayLogs ?? []) {
    const key = `${log.medication_id}_${log.scheduled_at}`;
    logMap.set(key, { status: log.status, snoozed_until: log.snoozed_until });
  }

  // Faellige Medikamente berechnen
  const dueMeds: Array<{
    medication: CareMedication;
    scheduled_at: string;
    status: string;
    snoozed_until: string | null;
  }> = [];

  // Medikamenten-Felder entschluesseln (Art. 9 DSGVO)
  const decryptedMeds = decryptFieldsArray(medications ?? [], CARE_MEDICATIONS_ENCRYPTED_FIELDS) as CareMedication[];

  for (const med of decryptedMeds) {
    const schedule = med.schedule;
    const times = schedule.type === 'daily' ? (schedule.times ?? []) :
                  schedule.type === 'weekly' ? (schedule.time ? [schedule.time] : []) : [];

    for (const time of times) {
      if (schedule.type === 'weekly' && !isDueAt(schedule, time, dayName)) continue;

      const scheduledAt = `${today}T${time}:00`;
      const key = `${med.id}_${scheduledAt}`;
      const logEntry = logMap.get(key);

      dueMeds.push({
        medication: med,
        scheduled_at: scheduledAt,
        status: logEntry?.status ?? 'pending',
        snoozed_until: logEntry?.snoozed_until ?? null,
      });
    }
  }

  dueMeds.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return NextResponse.json(dueMeds);
}
