// app/api/cron/waste-reminder/route.ts
// Nachbar.io — Cron: Müllabfuhr Push-Erinnerungen
// Vercel Cron: Täglich um 18:00 Uhr (Vorabend der Abholung)
// Findet Abholtermine für morgen und benachrichtigt Nutzer mit aktiver Erinnerung

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Deutsche Bezeichnungen für Müllarten
const WASTE_TYPE_LABELS: Record<string, string> = {
  restmuell: 'Restmüll',
  biomuell: 'Biomüll',
  papier: 'Papier',
  gelber_sack: 'Gelber Sack',
  gruenschnitt: 'Grünschnitt',
  sperrmuell: 'Sperrmüll',
};

export async function GET(request: NextRequest) {
  // Cron-Secret prüfen
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();

    // Morgiges Datum berechnen (UTC, da Supabase in UTC arbeitet)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Abholtermine fuer morgen: Neue Tabelle (source-driven) + Fallback (Legacy)
    const { data: newDates } = await supabase
      .from('waste_collection_dates')
      .select('id, area_id, waste_type, notes, time_hint')
      .eq('collection_date', tomorrowStr)
      .eq('is_cancelled', false);

    const { data: legacyDates } = await supabase
      .from('waste_schedules')
      .select('id, quarter_id, waste_type, notes')
      .eq('collection_date', tomorrowStr);

    // Source-driven bevorzugen, sonst Legacy
    const useNewDates = (newDates ?? []).length > 0;
    const schedules = useNewDates ? (newDates ?? []) : (legacyDates ?? []);

    if (schedules.length === 0) {
      console.log(JSON.stringify({
        level: 'info',
        cron: 'waste-reminder',
        message: 'Keine Abholtermine für morgen',
        date: tomorrowStr,
      }));
      return NextResponse.json({
        success: true,
        queued: 0,
        schedules: 0,
        date: tomorrowStr,
        timestamp: new Date().toISOString(),
      });
    }

    // Eindeutige Müllarten sammeln
    const wasteTypes = Array.from(new Set(schedules.map((s) => s.waste_type)));

    // Quartier-IDs: Bei neuen Daten über quarter_collection_areas View, bei Legacy direkt
    let quarterIds: string[] = [];
    if (useNewDates) {
      const areaIds = Array.from(new Set((newDates ?? []).map((d) => d.area_id)));
      const { data: areaQuarters } = await supabase
        .from('quarter_collection_areas')
        .select('quarter_id, area_id')
        .in('area_id', areaIds);
      quarterIds = Array.from(new Set((areaQuarters ?? []).map((aq: { quarter_id: string }) => aq.quarter_id)));
    } else {
      quarterIds = Array.from(new Set((legacyDates ?? []).map((s) => s.quarter_id)));
    }

    // 2. Nutzer mit aktiver Erinnerung für diese Müllarten finden
    const { data: reminders, error: remindersError } = await supabase
      .from('waste_reminders')
      .select('user_id, waste_type')
      .in('waste_type', wasteTypes)
      .eq('enabled', true)
      .eq('remind_at', 'evening_before');

    if (remindersError) {
      console.error(JSON.stringify({
        level: 'error',
        cron: 'waste-reminder',
        message: 'Fehler beim Laden der Erinnerungen',
        error: remindersError.message,
      }));
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      console.log(JSON.stringify({
        level: 'info',
        cron: 'waste-reminder',
        message: 'Keine aktiven Erinnerungen für diese Müllarten',
        date: tomorrowStr,
        wasteTypes,
      }));
      return NextResponse.json({
        success: true,
        queued: 0,
        schedules: schedules.length,
        date: tomorrowStr,
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Nutzer-IDs sammeln und deren Quartier-Zugehörigkeit prüfen
    const userIds = Array.from(new Set(reminders.map((r) => r.user_id)));

    // Haushaltsmitglieder mit Quartierzuordnung laden
    const { data: memberQuarters, error: memberError } = await supabase
      .from('household_members')
      .select('user_id, households!inner(quarter_id)')
      .in('user_id', userIds);

    if (memberError) {
      console.error(JSON.stringify({
        level: 'error',
        cron: 'waste-reminder',
        message: 'Fehler beim Laden der Haushaltsmitglieder',
        error: memberError.message,
      }));
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
    }

    // Nutzer → Quartier Mapping erstellen
    const userQuarterMap = new Map<string, string>();
    for (const member of memberQuarters || []) {
      const household = member.households as unknown as { quarter_id: string };
      if (household?.quarter_id) {
        userQuarterMap.set(member.user_id, household.quarter_id);
      }
    }

    // 4. Passende Benachrichtigungen zusammenstellen
    // Nur Nutzer benachrichtigen, die im betroffenen Quartier wohnen
    const notifications: Array<{
      userId: string;
      wasteType: string;
      label: string;
      quarterId: string;
    }> = [];

    for (const reminder of reminders) {
      const userQuarterId = userQuarterMap.get(reminder.user_id);
      if (!userQuarterId) continue;

      // Pruefen ob es einen passenden Abholtermin gibt
      const matchingSchedule = useNewDates
        ? schedules.find((s) => s.waste_type === reminder.waste_type && quarterIds.includes(userQuarterId))
        : schedules.find((s) => 'quarter_id' in s && s.quarter_id === userQuarterId && s.waste_type === reminder.waste_type);
      if (!matchingSchedule) continue;

      notifications.push({
        userId: reminder.user_id,
        wasteType: reminder.waste_type,
        label: WASTE_TYPE_LABELS[reminder.waste_type] || reminder.waste_type,
        quarterId: userQuarterId,
      });
    }

    // 5. Push-Subscriptions der zu benachrichtigenden Nutzer laden (für spätere Integration)
    if (notifications.length > 0) {
      const notifyUserIds = Array.from(new Set(notifications.map((n) => n.userId)));
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint')
        .in('user_id', notifyUserIds);

      const subsCount = subscriptions?.length ?? 0;

      // Stub: Benachrichtigungen loggen (Web Push kommt später)
      for (const notification of notifications) {
        const hasSub = subscriptions?.some((s) => s.user_id === notification.userId);
        console.log(JSON.stringify({
          level: 'info',
          cron: 'waste-reminder',
          action: 'notification_queued',
          userId: notification.userId,
          wasteType: notification.wasteType,
          label: notification.label,
          quarterId: notification.quarterId,
          date: tomorrowStr,
          hasPushSubscription: !!hasSub,
        }));
      }

      console.log(JSON.stringify({
        level: 'info',
        cron: 'waste-reminder',
        message: 'Erinnerungen verarbeitet',
        date: tomorrowStr,
        schedulesFound: schedules.length,
        remindersMatched: notifications.length,
        usersWithPush: subsCount,
        quarters: quarterIds.length,
      }));
    }

    return NextResponse.json({
      success: true,
      queued: notifications.length,
      schedules: schedules.length,
      date: tomorrowStr,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      cron: 'waste-reminder',
      message: 'Unerwarteter Cron-Fehler',
      error: err instanceof Error ? err.message : String(err),
    }));
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
