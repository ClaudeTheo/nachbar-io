// app/api/care/checkin/status/route.ts
// Nachbar.io — Heutiger Check-in-Status eines Seniors

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleServiceError } from '@/lib/services/service-error';
import { getTodayCheckinStatus } from '@/modules/care/services/checkin.service';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  try {
    const seniorId = request.nextUrl.searchParams.get('senior_id') ?? user.id;
    const result = await getTodayCheckinStatus(supabase, user.id, seniorId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
