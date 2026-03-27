// app/api/cron/event-reminders/route.ts
// Nachbar.io — Cron: Event Push-Erinnerungen
// Vercel Cron: Alle 15 Minuten
// Sendet Erinnerungen an RSVP-Teilnehmer (24h + 1h vor Event)

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { processEventReminders } from '@/lib/event-reminders';

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
    const result = await processEventReminders(supabase);

    console.log(
      `[event-reminders] ${result.sent} Erinnerungen gesendet, ` +
      `${result.skipped} übersprungen, ${result.events} Events geprüft`
    );

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[event-reminders] Cron-Fehler:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
