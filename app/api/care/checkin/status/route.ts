// app/api/care/checkin/status/route.ts
// Nachbar.io — Heutiger Check-in-Status eines Seniors

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CHECKIN_DEFAULTS } from '@/lib/care/constants';
import type { CareCheckin } from '@/lib/care/types';

// Antwort-Struktur für den Status-Endpunkt
interface CheckinStatusResponse {
  today: CareCheckin[];
  checkinTimes: string[];
  checkinEnabled: boolean;
  completedCount: number;
  totalCount: number;
  nextDue: string | null;
  allCompleted: boolean;
}

// GET /api/care/checkin/status — Heutigen Check-in-Status abrufen
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth-Check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Query-Parameter: senior_id (Standard: eingeloggter Nutzer)
  const { searchParams } = request.nextUrl;
  const seniorId = searchParams.get('senior_id') ?? user.id;

  // Tagesgrenzen berechnen: heute 00:00 bis morgen 00:00 (ISO-Format)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Heutige Check-ins und Care-Profil parallel abrufen
  const [checkinsResult, profileResult] = await Promise.all([
    supabase
      .from('care_checkins')
      .select('*')
      .eq('senior_id', seniorId)
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', tomorrowStart.toISOString())
      .order('scheduled_at', { ascending: true }),

    supabase
      .from('care_profiles')
      .select('checkin_times, checkin_enabled')
      .eq('user_id', seniorId)
      .maybeSingle(),
  ]);

  if (checkinsResult.error) {
    console.error('[care/checkin/status] Check-in-Abfrage fehlgeschlagen:', checkinsResult.error);
    return NextResponse.json(
      { error: 'Check-in-Status konnte nicht geladen werden' },
      { status: 500 }
    );
  }

  if (profileResult.error) {
    console.error('[care/checkin/status] Profil-Abfrage fehlgeschlagen:', profileResult.error);
    return NextResponse.json(
      { error: 'Care-Profil konnte nicht geladen werden' },
      { status: 500 }
    );
  }

  const todayCheckins: CareCheckin[] = (checkinsResult.data ?? []) as CareCheckin[];

  // Check-in-Zeiten und Aktivierungsstatus aus dem Profil oder Defaults laden
  const checkinTimes: string[] =
    profileResult.data?.checkin_times ?? [...CHECKIN_DEFAULTS.defaultTimes];
  const checkinEnabled: boolean = profileResult.data?.checkin_enabled ?? true;

  // Anzahl abgeschlossener Check-ins (completed_at ist gesetzt, Status nicht 'missed')
  const completedCount = todayCheckins.filter(
    (c) => c.completed_at !== null && c.status !== 'missed'
  ).length;

  const totalCount = checkinTimes.length;

  // Nächsten fälligen Check-in-Zeitpunkt ermitteln
  const nowTimeStr = formatTimeHHMM(new Date());
  const nextDue = findNextDueTime(checkinTimes, todayCheckins, nowTimeStr);

  const allCompleted = checkinEnabled && completedCount >= totalCount && totalCount > 0;

  const response: CheckinStatusResponse = {
    today: todayCheckins,
    checkinTimes,
    checkinEnabled,
    completedCount,
    totalCount,
    nextDue,
    allCompleted,
  };

  return NextResponse.json(response);
}

// Hilfsfunktion: Aktuelle Zeit als HH:MM formatieren
function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Hilfsfunktion: Nächsten fälligen Check-in-Zeitpunkt bestimmen
// Gibt den nächsten konfigurierten Zeitpunkt zurück, für den noch kein
// abgeschlossener Check-in heute vorliegt und der noch nicht vergangen ist.
function findNextDueTime(
  checkinTimes: string[],
  todayCheckins: CareCheckin[],
  nowTimeStr: string
): string | null {
  // Zeitpunkte, für die bereits heute ein abgeschlossener Check-in vorliegt
  const completedTimes = new Set(
    todayCheckins
      .filter((c) => c.completed_at !== null && c.status !== 'missed')
      .map((c) => formatTimeHHMM(new Date(c.scheduled_at)))
  );

  // Sortierte Zeiten durchlaufen und ersten noch ausstehenden zurückgeben
  const sortedTimes = [...checkinTimes].sort();
  for (const time of sortedTimes) {
    if (completedTimes.has(time)) continue;
    // Noch nicht vergangener Zeitpunkt → als nächsten fälligen zurückgeben
    if (time >= nowTimeStr) return time;
  }

  // Alle heutigen Zeiten sind entweder erledigt oder vergangen
  return null;
}
