// app/api/cron/waste-reminder/route.ts
// Nachbar.io — Cron: Müllabfuhr Push-Erinnerungen
// Vercel Cron: Täglich um 18:00 Uhr (Vorabend der Abholung)

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { handleServiceError } from '@/lib/services/service-error';
import { runWasteReminder } from '@/modules/waste/services/waste-reminder.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Cron-Secret prüfen
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runWasteReminder(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
