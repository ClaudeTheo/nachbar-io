// app/api/care/medications/due/route.ts
// Nachbar.io — Faellige Medikamente fuer heute berechnen

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;

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

  for (const med of (medications ?? []) as CareMedication[]) {
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
