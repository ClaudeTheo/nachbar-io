// app/api/cron/subscription-check/route.ts
// Nachbar.io — Cron: Trial-Ablauf prüfen + Auto-Downgrade
// Vercel Cron: täglich 09:00

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { handleServiceError } from '@/lib/services/service-error';
import { runSubscriptionCheck } from '@/lib/services/subscription-check.service';

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
    const result = await runSubscriptionCheck(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
