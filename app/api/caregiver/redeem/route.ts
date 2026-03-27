// app/api/caregiver/redeem/route.ts
// Nachbar.io — Einladungs-Code einlösen: Caregiver-Link erstellen

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, unauthorizedResponse, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import { writeAuditLog } from '@/lib/care/audit';
import type { CaregiverRelationshipType } from '@/lib/care/types';

const VALID_RELATIONSHIPS: CaregiverRelationshipType[] = [
  'partner', 'child', 'grandchild', 'friend', 'volunteer', 'other',
];

export async function POST(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: { code?: string; relationship_type?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungültiges Anfrage-Format', 400);
  }
  const { code, relationship_type } = body;

  if (!code || typeof code !== 'string') {
    return errorResponse('Code ist erforderlich', 400);
  }
  if (!relationship_type || !VALID_RELATIONSHIPS.includes(relationship_type as CaregiverRelationshipType)) {
    return errorResponse('Ungültiger Beziehungstyp', 400);
  }

  // Einladung suchen
  const { data: invite, error: inviteError } = await supabase
    .from('caregiver_invites')
    .select('id, resident_id, expires_at, used_at')
    .eq('invite_code', code.toUpperCase().trim())
    .single();

  if (inviteError || !invite) {
    return errorResponse('Ungültiger Einladungs-Code', 404);
  }

  // Self-Invite verhindern
  if (invite.resident_id === user.id) {
    return errorResponse('Sie können sich nicht selbst einladen', 403);
  }

  // Bereits eingelöst?
  if (invite.used_at) {
    return errorResponse('Einladungs-Code wurde bereits verwendet', 409);
  }

  // Abgelaufen?
  if (new Date(invite.expires_at) < new Date()) {
    return errorResponse('Einladungs-Code ist abgelaufen', 410);
  }

  // Caregiver-Link erstellen
  const { error: linkError } = await supabase
    .from('caregiver_links')
    .insert({
      resident_id: invite.resident_id,
      caregiver_id: user.id,
      relationship_type,
    });

  if (linkError) {
    // Duplikat? (unique constraint)
    if (linkError.code === '23505') {
      return errorResponse('Verknüpfung besteht bereits', 409);
    }
    return errorResponse('Verknüpfung konnte nicht erstellt werden', 500);
  }

  // Invite als benutzt markieren
  await supabase
    .from('caregiver_invites')
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq('id', invite.id);

  // Name des Bewohners für Bestätigung holen
  const { data: resident } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', invite.resident_id)
    .single();

  await writeAuditLog(supabase, {
    seniorId: invite.resident_id,
    actorId: user.id,
    eventType: 'caregiver_linked',
    metadata: { relationship_type, caregiver_id: user.id },
  });

  careLog('caregiver', 'code_redeemed', { caregiverId: user.id, residentId: invite.resident_id });

  return successResponse({
    resident_name: resident?.display_name ?? 'Bewohner',
    resident_id: invite.resident_id,
  }, 201);
}
