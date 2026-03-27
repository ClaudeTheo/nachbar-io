// app/api/cron/subscription-check/route.ts
// Nachbar.io — Cron: Trial-Ablauf prüfen + Auto-Downgrade
// Vercel Cron: täglich 09:00

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { checkTrialExpiry, downgradeToFree } from '@/lib/subscription';
import { sendPush } from '@/lib/care/channels/push';
import { writeCronHeartbeat } from '@/lib/care/cron-heartbeat';
import { safeInsertNotification } from '@/lib/notifications-server';

export async function GET(request: NextRequest) {
  // Vercel Cron-Authentifizierung
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

    // Trial-Ablauf prüfen
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
          body: 'Sie nutzen jetzt Nachbar Free. Upgraden Sie jederzeit für alle Funktionen.',
          url: '/einstellungen/abo',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[subscription-check] Downgrade fehlgeschlagen für ${userId}:`, msg);
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
        console.error(`[subscription-check] Warnung fehlgeschlagen für ${userId}:`, msg);
        errors.push(`warning:${userId}`);
      }
    }

    // Cron-Heartbeat schreiben
    await writeCronHeartbeat(supabase, 'subscription_check' as never, {
      downgraded,
      warnings,
      errors: errors.length,
    });

    console.log(`[subscription-check] ${downgraded} downgrades, ${warnings} warnungen, ${errors.length} fehler`);

    return NextResponse.json({
      success: true,
      downgraded,
      warnings,
      errors: errors.length,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[subscription-check] Cron-Fehler:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
