// app/api/cron/digest/route.ts
// Nachbar.io — Cron: Wöchentlicher Quartier-Digest
// Vercel Cron: Sonntag 18:00
// Fasst Quartier-Aktivität der Woche zusammen (Claude Haiku) und sendet Push

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
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
    let digestsSent = 0;

    // Anthropic Client
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.warn('[digest] ANTHROPIC_API_KEY nicht konfiguriert — Digest übersprungen');
      return NextResponse.json({ success: true, skipped: true, reason: 'no_api_key' });
    }
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Alle aktiven Quartiere
    const { data: quarters } = await supabase
      .from('quarters')
      .select('id, name')
      .in('status', ['active', 'thriving', 'activating']);

    for (const quarter of quarters ?? []) {
      // Wochendaten aggregieren
      const [postsResult, alertsResult, eventsResult, membersResult] = await Promise.all([
        // Neue Help Requests / Pinnwand-Posts
        supabase
          .from('help_requests')
          .select('id, title', { count: 'exact' })
          .eq('quarter_id', quarter.id)
          .gte('created_at', sevenDaysAgo.toISOString()),
        // Neue Alerts
        supabase
          .from('alerts')
          .select('id, category', { count: 'exact' })
          .eq('quarter_id', quarter.id)
          .gte('created_at', sevenDaysAgo.toISOString()),
        // Neue Events
        supabase
          .from('events')
          .select('id, title', { count: 'exact' })
          .eq('quarter_id', quarter.id)
          .gte('created_at', sevenDaysAgo.toISOString()),
        // Neue Mitglieder
        supabase
          .from('household_members')
          .select('user_id', { count: 'exact' })
          .eq('quarter_id', quarter.id)
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const weekData = {
        newPosts: postsResult.count ?? 0,
        postTitles: (postsResult.data ?? []).slice(0, 5).map((p: { title: string }) => p.title),
        newAlerts: alertsResult.count ?? 0,
        alertCategories: [...new Set((alertsResult.data ?? []).map((a: { category: string }) => a.category))],
        newEvents: eventsResult.count ?? 0,
        eventTitles: (eventsResult.data ?? []).slice(0, 3).map((e: { title: string }) => e.title),
        newMembers: membersResult.count ?? 0,
      };

      // Keine Aktivität → kein Digest
      const hasActivity = weekData.newPosts > 0 || weekData.newAlerts > 0 ||
                          weekData.newEvents > 0 || weekData.newMembers > 0;
      if (!hasActivity) continue;

      // Claude Haiku Zusammenfassung
      let summary: string;
      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Du bist der Nachbarschafts-Assistent für das Quartier "${quarter.name}".\n` +
              `Fasse die Woche in 3-5 Sätzen zusammen. Tonalitaet: freundlich, Siezen, sachlich.\n` +
              `Keine Emojis. Kein Hype.\n` +
              `Daten: ${JSON.stringify(weekData)}`,
          }],
        });
        summary = response.content[0].type === 'text' ? response.content[0].text : '';
      } catch (aiError) {
        console.error(`[digest] Claude API Fehler für ${quarter.name}:`, aiError);
        // Fallback: Einfache Zusammenfassung ohne KI
        summary = `Diese Woche in ${quarter.name}: ${weekData.newPosts} neue Beitraege, ` +
          `${weekData.newAlerts} Meldungen, ${weekData.newEvents} Events, ` +
          `${weekData.newMembers} neue Nachbarn.`;
      }

      // Push an alle Mitglieder des Quartiers
      const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('quarter_id', quarter.id);

      for (const member of members ?? []) {
        await sendPush(supabase, {
          userId: member.user_id,
          title: `Wochenrückblick: ${quarter.name}`,
          body: summary.slice(0, 200),
          url: '/dashboard',
        });

        await safeInsertNotification(supabase, {
          user_id: member.user_id,
          type: 'broadcast',
          title: `Wochenrückblick: ${quarter.name}`,
          body: summary,
        });

        digestsSent++;
      }
    }

    await writeCronHeartbeat(supabase, 'digest', { digestsSent });

    console.log(`[digest] ${digestsSent} Digest-Nachrichten gesendet`);
    return NextResponse.json({
      success: true,
      digestsSent,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[digest] Cron-Fehler:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
