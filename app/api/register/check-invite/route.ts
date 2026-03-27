import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/invite-codes";

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

    // 1. Zuerst in households.invite_code suchen (B2B-Codes)
    const { data: household } = await supabase
      .from("households")
      .select("id, street_name, house_number")
      .eq("invite_code", normalized)
      .single();

    if (household) {
      return NextResponse.json({
        valid: true,
        householdId: household.id,
        streetName: household.street_name,
        houseNumber: household.house_number,
      });
    }

    // 2. Dann in neighbor_invitations suchen (persoenliche Einladungen)
    const { data: invitation } = await supabase
      .from("neighbor_invitations")
      .select("id, household_id, inviter_id, households(street_name, house_number)")
      .eq("invite_code", normalized)
      .eq("status", "sent")
      .single();

    if (invitation?.household_id) {
      const hh = invitation.households as unknown as { street_name: string; house_number: string } | null;
      return NextResponse.json({
        valid: true,
        householdId: invitation.household_id,
        streetName: hh?.street_name ?? "",
        houseNumber: hh?.house_number ?? "",
        referrerId: invitation.inviter_id,
      });
    }

    return NextResponse.json({ valid: false });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Serverfehler" },
      { status: 500 }
    );
  }
}
