// app/api/cron/heartbeat-cleanup/route.ts
// Nachbar.io — Heartbeat-Cleanup: Loescht Heartbeats aelter als 90 Tage
// Vercel Cron: wöchentlich Sonntag 3:00 Uhr

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { HEARTBEAT_RETENTION_DAYS } from '@/lib/care/constants';

// GET /api/cron/heartbeat-cleanup — Alte Heartbeats löschen (90-Tage-Retention)
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET prüfen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/heartbeat-cleanup] CRON_SECRET nicht konfiguriert — Endpoint gesperrt');
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const supabase = getAdminSupabase();

  // Cutoff-Datum berechnen: jetzt - HEARTBEAT_RETENTION_DAYS (90 Tage)
  const now = new Date();
  const cutoff = new Date(now.getTime() - HEARTBEAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffISO = cutoff.toISOString();

  // Alle Heartbeats aelter als Cutoff-Datum löschen
  const { data, error } = await supabase
    .from('heartbeats')
    .delete()
    .lt('created_at', cutoffISO)
    .select('id');

  if (error) {
    console.error('[cron/heartbeat-cleanup] Löschen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Heartbeat-Cleanup fehlgeschlagen', details: error.message },
      { status: 500 }
    );
  }

  const deletedCount = data?.length ?? 0;

  console.log(
    `[cron/heartbeat-cleanup] ${deletedCount} Heartbeats gelöscht (aelter als ${HEARTBEAT_RETENTION_DAYS} Tage, cutoff: ${cutoffISO})`
  );

  return NextResponse.json({
    deleted: deletedCount,
    cutoff: cutoffISO,
    retentionDays: HEARTBEAT_RETENTION_DAYS,
    timestamp: now.toISOString(),
  });
}
