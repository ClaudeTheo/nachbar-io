import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/invite-codes";

/**
 * POST /api/register/check-invite
 *
 * Prueft ob ein Einladungscode gueltig ist.
 * Verwendet Service-Role weil unauthentifizierte Nutzer
 * die households-Tabelle nicht lesen duerfen (RLS).
 *
 * Body: { inviteCode: string }
 * Response: { valid: true, householdId, streetName, houseNumber } oder { valid: false }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json(
        { valid: false, error: "Kein Einladungscode angegeben" },
        { status: 400 }
      );
    }

    const normalized = normalizeCode(inviteCode);
    if (!normalized || normalized.length < 4) {
      return NextResponse.json({ valid: false });
    }

    const supabase = getAdminSupabase();
    const { data: household, error } = await supabase
      .from("households")
      .select("id, street_name, house_number")
      .eq("invite_code", normalized)
      .single();

    if (error || !household) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      householdId: household.id,
      streetName: household.street_name,
      houseNumber: household.house_number,
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Serverfehler" },
      { status: 500 }
    );
  }
}
