// app/api/cron/dormancy/route.ts
// Nachbar.io — Cron: Dormancy-Detection
// Vercel Cron: taeglich 06:00
// Erkennt inaktive Quartiere und sendet Re-Engagement-Pushes

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/care/channels/push';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { safeInsertNotification } from '@/lib/notifications-server';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let quartersProcessed = 0;
    let pushesSent = 0;

    // Alle aktiven Quartiere laden
    const { data: quarters, error: qError } = await supabase
      .from('quarters')
      .select('id, name, status, weekly_active_pct, household_count')
      .in('status', ['active', 'thriving', 'activating']);

    if (qError) {
      console.error('[dormancy] Quartier-Query fehlgeschlagen:', qError);
      return NextResponse.json({ error: 'DB-Fehler' }, { status: 500 });
    }

    for (const quarter of quarters ?? []) {
      // Mitglieder des Quartiers holen
      const { data: quarterMembers } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('quarter_id', quarter.id);

      const quarterUserIds = (quarterMembers ?? []).map((m: { user_id: string }) => m.user_id);
      const total = quarterUserIds.length;
      if (total === 0) continue;

      // Aktive User der letzten 7 Tage zaehlen (Quartier-bezogen)
      let activeInQuarter = 0;
      if (quarterUserIds.length > 0) {
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .in('id', quarterUserIds)
          .gt('last_seen', sevenDaysAgo.toISOString());
        activeInQuarter = count ?? 0;
      }

      const pct = Math.round((activeInQuarter / total) * 100);

      // weekly_active_pct aktualisieren
      await supabase
        .from('quarters')
        .update({ weekly_active_pct: pct })
        .eq('id', quarter.id);

      quartersProcessed++;

      // Wenn < 10% aktiv: Re-Engagement-Push an alle Mitglieder
      if (pct < 10 && quarterUserIds.length > 0) {
        for (const userId of quarterUserIds) {
          await sendPush(supabase, {
            userId,
            title: 'Ihre Nachbarschaft vermisst Sie!',
            body: `Im Quartier ${quarter.name} ist es ruhig geworden. Schauen Sie mal vorbei!`,
            url: '/dashboard',
          });

          await safeInsertNotification(supabase, {
            user_id: userId,
            type: 'broadcast',
            title: 'Ihre Nachbarschaft vermisst Sie!',
            body: `Im Quartier ${quarter.name} ist es ruhig geworden. Schauen Sie mal vorbei!`,
          });

          pushesSent++;
        }
      }
    }

    await writeCronHeartbeat(supabase, 'dormancy', {
      quartersProcessed,
      pushesSent,
    });

    console.log(`[dormancy] ${quartersProcessed} Quartiere geprueft, ${pushesSent} Pushes`);
    return NextResponse.json({
      success: true,
      quartersProcessed,
      pushesSent,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[dormancy] Cron-Fehler:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
