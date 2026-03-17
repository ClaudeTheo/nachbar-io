// app/api/caregiver/links/route.ts
// Nachbar.io — Caregiver-Links auflisten

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSubscription, unauthorizedResponse, errorResponse, successResponse } from '@/lib/care/api-helpers';

export async function GET(_request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  // Links als Bewohner (alle eigenen)
  const { data: asResident } = await supabase
    .from('caregiver_links')
    .select('*, caregiver:caregiver_id(display_name, avatar_url)')
    .eq('resident_id', user.id)
    .order('created_at', { ascending: false });

  // Links als Caregiver (nur aktive)
  const { data: asCaregiver } = await supabase
    .from('caregiver_links')
    .select('*, resident:resident_id(display_name, avatar_url)')
    .eq('caregiver_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  return successResponse({
    as_resident: asResident ?? [],
    as_caregiver: asCaregiver ?? [],
  });
}
