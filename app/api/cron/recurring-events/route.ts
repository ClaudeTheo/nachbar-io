// app/api/cron/recurring-events/route.ts
// Nachbar.io — Cron: Wiederkehrende Events
// Vercel Cron: Täglich um 04:00
// Erstellt nächste Instanz für vergangene wiederkehrende Events

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { processRecurringEvents } from '@/lib/recurring-events';

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
    const result = await processRecurringEvents(supabase);

    console.log(
      `[recurring-events] ${result.created} neue Instanzen erstellt, ` +
      `${result.skipped} übersprungen, ${result.total} Events geprüft`
    );

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[recurring-events] Cron-Fehler:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
