// app/api/cron/analytics/route.ts
// Nachbar.io — Analytics Cron: Berechnet taeglich KPI-Snapshots pro Quartier
// Vercel Cron: taeglich um 3:00 Uhr

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { calculateQuarterSnapshot, saveSnapshot } from '@/lib/analytics';

// GET /api/cron/analytics — Taeglich KPI-Snapshots berechnen und speichern
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/analytics] CRON_SECRET nicht konfiguriert — Endpoint gesperrt');
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const now = new Date();

  // Alle aktiven Quartiere laden
  const { data: quarters, error: quartersError } = await supabase
    .from('quarters')
    .select('id, name')
    .eq('status', 'active');

  if (quartersError) {
    console.error('[cron/analytics] Quartiere laden fehlgeschlagen:', quartersError);
    return NextResponse.json(
      { error: 'Quartiere konnten nicht geladen werden', details: quartersError.message },
      { status: 500 }
    );
  }

  if (!quarters || quarters.length === 0) {
    console.log('[cron/analytics] Keine aktiven Quartiere gefunden — nichts zu berechnen');
    return NextResponse.json({
      message: 'Keine aktiven Quartiere',
      processed: 0,
      timestamp: now.toISOString(),
    });
  }

  // Fuer jedes Quartier: Snapshot berechnen und speichern
  const results: Array<{ quarterId: string; quarterName: string; success: boolean; error?: string }> = [];

  for (const quarter of quarters) {
    try {
      const snapshot = await calculateQuarterSnapshot(supabase, quarter.id, now);
      await saveSnapshot(supabase, snapshot);
      results.push({ quarterId: quarter.id, quarterName: quarter.name, success: true });
      console.log(
        `[cron/analytics] Snapshot gespeichert: ${quarter.name} — WAH=${snapshot.wah}, Users=${snapshot.total_users}, Active7d=${snapshot.active_users_7d}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      results.push({ quarterId: quarter.id, quarterName: quarter.name, success: false, error: message });
      console.error(`[cron/analytics] Fehler bei ${quarter.name}:`, message);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(
    `[cron/analytics] Fertig: ${successCount} erfolgreich, ${failCount} fehlgeschlagen (${quarters.length} Quartiere)`
  );

  return NextResponse.json({
    processed: quarters.length,
    success: successCount,
    failed: failCount,
    results,
    timestamp: now.toISOString(),
  });
}
