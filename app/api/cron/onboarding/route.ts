// app/api/cron/onboarding/route.ts
// Nachbar.io — Cron: Onboarding-Push-Sequenz
// Vercel Cron: alle 15 Minuten
// Sendet zeitgesteuerte Push-Nachrichten an neue Nutzer

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/care/channels/push';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { safeInsertNotification } from '@/lib/notifications-server';

// Onboarding-Schritte mit Delay und Nachrichtentext
const ONBOARDING_STEPS = [
  {
    step: 'welcome',
    delayHours: 0,
    title: 'Willkommen bei QuartierApp!',
    body: 'Lernen Sie Ihre Nachbarn kennen.',
    url: '/dashboard',
  },
  {
    step: 'profile',
    delayHours: 24,
    title: 'Profil vervollständigen',
    body: 'Vervollständigen Sie Ihr Profil — so finden Nachbarn Sie leichter.',
    url: '/profile',
  },
  {
    step: 'pinnwand',
    delayHours: 72,
    title: 'Was passiert nebenan?',
    body: 'Schauen Sie auf die Pinnwand — was passiert in Ihrer Nachbarschaft?',
    url: '/pinnwand',
  },
  {
    step: 'connect',
    delayHours: 168,
    title: 'Nachbarn einladen',
    body: 'Kennen Sie schon Ihre Nachbarn? Laden Sie jemanden ein.',
    url: '/invite',
  },
  {
    step: 'help',
    delayHours: 336,
    title: 'Hilfe anbieten oder suchen',
    body: 'Brauchen Sie Hilfe oder können Sie welche anbieten?',
    url: '/help',
  },
  {
    step: 'feedback',
    delayHours: 720,
    title: 'Wie gefällt Ihnen QuartierApp?',
    body: 'Wir freuen uns über Ihr Feedback.',
    url: '/feedback',
  },
] as const;

export async function GET(request: NextRequest) {
  // Auth
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET nicht konfiguriert');
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date();
    let totalSent = 0;

    // Alle User holen, die in den letzten 30 Tagen registriert wurden
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (usersError) {
      console.error('[onboarding] Users-Query fehlgeschlagen:', usersError);
      return NextResponse.json({ error: 'DB-Fehler' }, { status: 500 });
    }

    if (!recentUsers?.length) {
      await writeCronHeartbeat(supabase, 'onboarding', { sent: 0 });
      return NextResponse.json({ success: true, sent: 0 });
    }

    // Bereits gesendete Schritte laden
    const userIds = recentUsers.map(u => u.id);
    const { data: sentSteps } = await supabase
      .from('onboarding_steps')
      .select('user_id, step')
      .in('user_id', userIds);

    // Set für schnellen Lookup: "userId:step"
    const sentSet = new Set(
      (sentSteps ?? []).map((s: { user_id: string; step: string }) => `${s.user_id}:${s.step}`)
    );

    // Pro User: fällige Schritte senden
    for (const user of recentUsers) {
      const hoursSinceRegistration =
        (now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60);

      for (const stepDef of ONBOARDING_STEPS) {
        if (stepDef.delayHours > hoursSinceRegistration) continue;
        if (sentSet.has(`${user.id}:${stepDef.step}`)) continue;

        // Push senden
        await sendPush(supabase, {
          userId: user.id,
          title: stepDef.title,
          body: stepDef.body,
          url: stepDef.url,
        });

        // In-App Notification
        await safeInsertNotification(supabase, {
          user_id: user.id,
          type: 'broadcast',
          title: stepDef.title,
          body: stepDef.body,
        });

        // Schritt als gesendet markieren
        await supabase.from('onboarding_steps').insert({
          user_id: user.id,
          step: stepDef.step,
        });

        totalSent++;
      }
    }

    await writeCronHeartbeat(supabase, 'onboarding', { sent: totalSent });

    console.log(`[onboarding] ${totalSent} Nachrichten gesendet`);
    return NextResponse.json({ success: true, sent: totalSent, timestamp: now.toISOString() });
  } catch (err) {
    console.error('[onboarding] Cron-Fehler:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
