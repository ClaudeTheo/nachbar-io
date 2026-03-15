// app/api/caregiver/invite/route.ts
// Nachbar.io — Caregiver-Einladung: 8-stelliger Code, 24h gueltig

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, careLog } from '@/lib/care/api-helpers';
import { writeAuditLog } from '@/lib/care/audit';
import { MAX_CAREGIVERS_PER_RESIDENT, INVITE_CODE_LENGTH, INVITE_CODE_EXPIRY_HOURS } from '@/lib/care/constants';

// 8-stelliger alphanumerischer Code (ohne verwechselbare Zeichen: 0/O, 1/I/L)
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(_request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse('Nicht autorisiert', 401);
  const { supabase, user } = authResult;

  // Aktive Links zaehlen
  const { data: activeLinks } = await supabase
    .from('caregiver_links')
    .select('id')
    .eq('resident_id', user.id)
    .is('revoked_at', null);

  if ((activeLinks?.length ?? 0) >= MAX_CAREGIVERS_PER_RESIDENT) {
    return errorResponse(
      `Maximal ${MAX_CAREGIVERS_PER_RESIDENT} Angehoerige erlaubt`,
      409
    );
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_CODE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('caregiver_invites')
    .insert({
      resident_id: user.id,
      invite_code: code,
      expires_at: expiresAt,
    })
    .select('invite_code, expires_at')
    .single();

  if (error) {
    return errorResponse('Einladung konnte nicht erstellt werden', 500);
  }

  await writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: 'caregiver_invited',
    metadata: { invite_code: code },
  });

  careLog('caregiver', 'invite_created', { userId: user.id });

  return successResponse({ code: data.invite_code, expires_at: data.expires_at }, 201);
}
