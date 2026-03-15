// app/api/resident/status/route.ts
// Nachbar.io — Bewohner-Status: ok/warning/missing/critical basierend auf Heartbeat

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/care/api-helpers';
import { HEARTBEAT_ESCALATION } from '@/lib/care/constants';
import type { ResidentStatus } from '@/lib/care/types';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse('Nicht autorisiert', 401);
  const { supabase, user } = authResult;

  const residentId = request.nextUrl.searchParams.get('resident_id');
  if (!residentId) {
    return errorResponse('resident_id ist erforderlich', 400);
  }

  // Pruefen ob Caregiver-Link besteht
  const { data: link } = await supabase
    .from('caregiver_links')
    .select('id, heartbeat_visible')
    .eq('resident_id', residentId)
    .eq('caregiver_id', user.id)
    .is('revoked_at', null)
    .single();

  if (!link) {
    return errorResponse('Keine Verknuepfung zu diesem Bewohner', 403);
  }

  // Letzter Heartbeat (nur wenn heartbeat_visible)
  let lastHeartbeat: string | null = null;
  let status: ResidentStatus = 'ok';

  if (link.heartbeat_visible) {
    const { data: hb } = await supabase
      .from('heartbeats')
      .select('created_at')
      .eq('user_id', residentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    lastHeartbeat = hb?.created_at ?? null;

    if (!lastHeartbeat) {
      status = 'ok'; // Noch nie benutzt → kein Alarm
    } else {
      const hoursAgo = (Date.now() - new Date(lastHeartbeat).getTime()) / 3600000;
      if (hoursAgo <= HEARTBEAT_ESCALATION.ok_hours) status = 'ok';
      else if (hoursAgo <= HEARTBEAT_ESCALATION.reminder_hours) status = 'warning';
      else if (hoursAgo <= HEARTBEAT_ESCALATION.alert_hours) status = 'missing';
      else status = 'critical';
    }
  }

  // Letztes Check-in
  const { data: checkin } = await supabase
    .from('care_checkins')
    .select('status, created_at')
    .eq('senior_id', residentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return successResponse({
    status,
    last_heartbeat: lastHeartbeat,
    heartbeat_visible: link.heartbeat_visible,
    last_checkin: checkin ? { status: checkin.status, at: checkin.created_at } : null,
  });
}
