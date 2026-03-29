import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkInviteCode } from "@/lib/services/registration.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * POST /api/register/check-invite
 *
 * Prüft ob ein Einladungscode gültig ist.
 * Verwendet Service-Role weil unauthentifizierte Nutzer
 * die households-Tabelle nicht lesen dürfen (RLS).
 *
 * Body: { inviteCode: string }
 * Response: { valid: true, householdId, streetName, houseNumber } oder { valid: false }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode } = body;

    const adminDb = getAdminSupabase();
    const result = await checkInviteCode(adminDb, inviteCode);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
