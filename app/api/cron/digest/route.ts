// app/api/cron/digest/route.ts
// Nachbar.io — Cron: Wöchentlicher Quartier-Digest
// Vercel Cron: Sonntag 18:00

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { runDigestCron } from '@/lib/services/digest-cron.service';
import { handleServiceError } from '@/lib/services/service-error';

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
    const result = await runDigestCron(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
