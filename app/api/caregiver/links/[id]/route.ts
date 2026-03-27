// app/api/caregiver/links/[id]/route.ts
// Nachbar.io — Caregiver-Link aktualisieren (Widerruf oder Heartbeat-Toggle)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, unauthorizedResponse, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import { writeAuditLog } from '@/lib/care/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;
  const { id } = await params;

  // Prüfen ob der Link dem Bewohner gehört
  const { data: link } = await supabase
    .from('caregiver_links')
    .select('id, resident_id, caregiver_id')
    .eq('id', id)
    .eq('resident_id', user.id)
    .single();

  if (!link) {
    return errorResponse('Link nicht gefunden', 404);
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Widerruf
  if (body.revoke === true) {
    updates.revoked_at = new Date().toISOString();
    await writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'caregiver_revoked',
      metadata: { caregiver_id: link.caregiver_id, link_id: id },
    });
    careLog('caregiver', 'link_revoked', { linkId: id });
  }

  // Heartbeat-Toggle
  if (typeof body.heartbeat_visible === 'boolean') {
    updates.heartbeat_visible = body.heartbeat_visible;
    await writeAuditLog(supabase, {
      seniorId: user.id,
      actorId: user.id,
      eventType: 'heartbeat_toggle',
      metadata: { caregiver_id: link.caregiver_id, visible: body.heartbeat_visible },
    });
    careLog('caregiver', 'heartbeat_toggled', { linkId: id, visible: body.heartbeat_visible });
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('Keine Änderungen angegeben', 400);
  }

  const { error } = await supabase
    .from('caregiver_links')
    .update(updates)
    .eq('id', id);

  if (error) {
    return errorResponse('Aktualisierung fehlgeschlagen', 500);
  }

  return successResponse({ ok: true });
}
