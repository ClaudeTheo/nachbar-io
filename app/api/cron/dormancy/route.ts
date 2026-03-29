// app/api/cron/dormancy/route.ts
// Nachbar.io — Cron: Dormancy-Detection
// Vercel Cron: täglich 06:00
// Thin wrapper — Business-Logik in lib/services/dormancy-cron.service.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { runDormancyCron } from '@/lib/services/dormancy-cron.service';
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
    const result = await runDormancyCron(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
