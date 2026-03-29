// app/api/cron/onboarding/route.ts
// Nachbar.io — Cron: Onboarding-Push-Sequenz
// Vercel Cron: alle 15 Minuten

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { handleServiceError } from '@/lib/services/service-error';
import { runOnboardingCron } from '@/modules/onboarding/services/onboarding-cron.service';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  try {
    const supabase = getAdminSupabase();
    const result = await runOnboardingCron(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
