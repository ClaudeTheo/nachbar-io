// Nachbar.io — Subscription-Check-Service
// Extrahiert aus app/api/cron/subscription-check/route.ts
// Trial-Ablauf pruefen, Downgrade auf Free, Warnungen versenden.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError } from '@/lib/services/service-error';
import { checkTrialExpiry, downgradeToFree } from '@/lib/subscription';
import { sendPush } from '@/lib/care/channels/push';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { safeInsertNotification } from '@/lib/notifications-server';

export interface SubscriptionCheckResult {
  success: boolean;
  downgraded: number;
  warnings: number;
  errors: number;
  timestamp: string;
}

export async function runSubscriptionCheck(
  supabase: SupabaseClient
): Promise<SubscriptionCheckResult> {
  const now = new Date();

  // Trial-Ablauf pruefen
  const { expired, warned } = await checkTrialExpiry(supabase);

  let downgraded = 0;
  let warnings = 0;
  const errors: string[] = [];

  // Abgelaufene Trials → Downgrade auf Free
  for (const userId of expired) {
    try {
      await downgradeToFree(supabase, userId);
      downgraded++;

      // Benachrichtigung: Trial abgelaufen
      await safeInsertNotification(supabase, {
        user_id: userId,
        type: 'system',
        title: 'Ihr Testzeitraum ist abgelaufen',
        body: 'Ihr kostenloser Testzeitraum ist beendet. Sie nutzen jetzt Nachbar Free. Upgraden Sie jederzeit, um alle Funktionen wieder freizuschalten.',
      });

      await sendPush(supabase, {
        userId,
        title: 'Testzeitraum abgelaufen',
        body: 'Sie nutzen jetzt Nachbar Free. Upgraden Sie jederzeit fuer alle Funktionen.',
        url: '/einstellungen/abo',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[subscription-check] Downgrade fehlgeschlagen fuer ${userId}:`, msg);
      errors.push(`downgrade:${userId}`);
    }
  }

  // Bald ablaufende Trials → Warnung senden
  for (const userId of warned) {
    try {
      await safeInsertNotification(supabase, {
        user_id: userId,
        type: 'system',
        title: 'Ihr Testzeitraum endet bald',
        body: 'In wenigen Tagen endet Ihr kostenloser Testzeitraum. Upgraden Sie jetzt, um alle Funktionen zu behalten.',
      });

      await sendPush(supabase, {
        userId,
        title: 'Testzeitraum endet bald',
        body: 'Upgraden Sie jetzt, um Ihre Plus-Funktionen zu behalten.',
        url: '/einstellungen/abo',
      });

      warnings++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[subscription-check] Warnung fehlgeschlagen fuer ${userId}:`, msg);
      errors.push(`warning:${userId}`);
    }
  }

  // Cron-Heartbeat schreiben
  await writeCronHeartbeat(supabase, 'subscription_check' as never, {
    downgraded,
    warnings,
    errors: errors.length,
  });

  console.log(
    `[subscription-check] ${downgraded} downgrades, ${warnings} warnungen, ${errors.length} fehler`
  );

  return {
    success: true,
    downgraded,
    warnings,
    errors: errors.length,
    timestamp: now.toISOString(),
  };
}
