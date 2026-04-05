import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findNewUsersForWelcomePack, sendWelcomePack } from '@/lib/welcome-pack';

/**
 * GET /api/cron/welcome
 *
 * Sendet Willkommenspakete an neue Nutzer (1h nach Registrierung).
 * Laeuft alle 30 Minuten via Vercel Cron.
 */
export async function GET(request: Request) {
  // Cron-Secret pruefen (PFLICHT — blockiert wenn Secret fehlt)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const newUsers = await findNewUsersForWelcomePack(supabase);

  if (newUsers.length === 0) {
    return NextResponse.json({ message: 'Keine neuen Nutzer für Willkommenspaket', count: 0 });
  }

  const results = [];
  for (const user of newUsers) {
    const result = await sendWelcomePack(supabase, user.id, user.quarter_id, user.display_name);
    results.push({ userId: user.id, ...result });
  }

  return NextResponse.json({
    count: results.filter(r => r.sent).length,
    results,
  });
}
