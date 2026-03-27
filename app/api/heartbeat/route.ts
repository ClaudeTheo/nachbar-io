// app/api/heartbeat/route.ts
// Nachbar.io — Heartbeat API: Passives Check-in bei App-Öffnung (1 pro Session)

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import type { HeartbeatSource, HeartbeatDeviceType } from '@/lib/care/types';

const VALID_SOURCES: HeartbeatSource[] = ['app', 'kiosk', 'web'];
const VALID_DEVICE_TYPES: HeartbeatDeviceType[] = ['mobile', 'tablet', 'kiosk', 'desktop'];

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse('Nicht autorisiert', 401);
  const { supabase, user } = authResult;

  const body = await request.json();
  const { source, device_type } = body;

  // Validierung
  if (!source || !VALID_SOURCES.includes(source)) {
    return errorResponse('Ungültiger source-Wert', 400);
  }
  if (device_type && !VALID_DEVICE_TYPES.includes(device_type)) {
    return errorResponse('Ungültiger device_type-Wert', 400);
  }

  const { error } = await supabase.from('heartbeats').insert({
    user_id: user.id,
    source,
    device_type: device_type || null,
  });

  if (error) {
    return errorResponse('Heartbeat konnte nicht gespeichert werden', 500);
  }

  careLog('heartbeat', 'created', { userId: user.id, source, device_type });

  return successResponse({ ok: true }, 201);
}
