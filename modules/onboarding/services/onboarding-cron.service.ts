// modules/onboarding/services/onboarding-cron.service.ts
// Nachbar.io — Business-Logik: Onboarding-Push-Sequenz (Cron)

import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError } from '@/lib/services/service-error';
import { sendPush } from '@/lib/care/channels/push';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { safeInsertNotification } from '@/lib/notifications-server';

// Onboarding-Schritte mit Delay und Nachrichtentext
export const ONBOARDING_STEPS = [
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

// Führt die Onboarding-Push-Sequenz für alle kürzlich registrierten Nutzer aus
export async function runOnboardingCron(
  supabase: SupabaseClient
): Promise<{ success: boolean; sent: number; timestamp: string }> {
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
    throw new ServiceError('DB-Fehler bei Users-Query', 500);
  }

  if (!recentUsers?.length) {
    await writeCronHeartbeat(supabase, 'onboarding', { sent: 0 });
    return { success: true, sent: 0, timestamp: now.toISOString() };
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
  return { success: true, sent: totalSent, timestamp: now.toISOString() };
}
